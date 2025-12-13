import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import sequelize from '@/lib/db';
import { Book, User } from '@/models/index';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    // Pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (query) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { keywords: { [Op.like]: `%${query}%` } },
          { category: { [Op.like]: `%${query}%` } },
        ],
      };
    }

    // Exact category filter if provided and not just part of query
    if (category) {
      whereClause.category = category;
    }

    // Geolocation Search Optimization
    let include = [{
      model: User,
      as: 'seller',
      attributes: ['name', 'latitude', 'longitude', 'city', 'state']
    }];

    let order = [['createdAt', 'DESC']];

    if (lat && lng) {
      // 1. Filter by Bounding Box (approx 50km radius)
      // 1 degree latitude ~ 111km. 0.5 degrees ~ 55km.
      const range = 0.5;

      include[0].where = {
        latitude: { [Op.between]: [lat - range, lat + range] },
        longitude: { [Op.between]: [lng - range, lng + range] }
      };

      // If filtering by distance, we cannot easily use SQL LIMIT because sorting is done in JS (for SQLite complexity)
      // However, bounding box significantly reduces result set.
      // We will fetch ALL within bounding box, sort, then paginate in memory.
      // This is a tradeoff for using SQLite/Sequelize without PostGIS.
    }

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      include: include,
      order: order,
      // Only apply SQL limit if NOT doing distance sort (or if we accept unordered distance results in pages)
      // For now, if lat/lng is present, we ignore SQL limit/offset and do it in JS.
      limit: (lat && lng) ? undefined : limit,
      offset: (lat && lng) ? undefined : offset,
      distinct: true, // Needed for correct count with include
    });

    let results = rows.map(book => book.toJSON());

    // Post-processing for distance if lat/lng provided
    if (lat && lng) {
      results = results.map(book => {
        const seller = book.seller;
        if (seller && seller.latitude && seller.longitude) {
          const dist = getDistanceFromLatLonInKm(lat, lng, seller.latitude, seller.longitude);
          return { ...book, distance: dist };
        }
        return { ...book, distance: null };
      })
      .filter(b => b.distance !== null) // optional: remove invalid location items
      .sort((a, b) => a.distance - b.distance);

      // Manual Pagination for distance sorted results
      const total = results.length;
      results = results.slice(offset, offset + limit);

      return NextResponse.json({
        data: results,
        pagination: {
          total: total,
          page: page,
          limit: limit,
          totalPages: Math.ceil(total / limit)
        }
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
      });
    }

    return NextResponse.json({
      data: results,
      pagination: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error) {
    console.error('Books GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'seller' && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get('title');
    const pages = formData.get('pages');
    const price = formData.get('price');
    const description = formData.get('description');
    const category = formData.get('category');
    const keywords = formData.get('keywords');
    const discount = formData.get('discount') || 0;
    const images = formData.getAll('images'); // Array of files

    if (!title || !pages || !price || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const imageOrderRaw = formData.get('imageOrder');
    let imageOrder = [];
    if (imageOrderRaw) {
      try {
        imageOrder = JSON.parse(imageOrderRaw);
      } catch (e) {
        imageOrder = [];
      }
    }

    const newImagePaths = [];
    for (const image of images) {
      if (image && typeof image.arrayBuffer === 'function' && image.name) {
        const buffer = Buffer.from(await image.arrayBuffer());
        const filename = Date.now() + '-' + image.name.replace(/\s/g, '-');
        const uploadPath = path.join(process.cwd(), 'public/uploads', filename);
        await mkdir(path.dirname(uploadPath), { recursive: true });
        await writeFile(uploadPath, buffer);
        newImagePaths.push(`/uploads/${filename}`);
      }
    }

    let finalImages = [];
    if (imageOrder.length > 0) {
      let newImgIdx = 0;
      finalImages = imageOrder.map(item => {
        if (item === 'new-image-placeholder') {
          return newImagePaths[newImgIdx++] || null;
        }
        return item;
      }).filter(Boolean);
    } else {
      finalImages = newImagePaths;
    }

    const newBook = await Book.create({
      title,
      pages,
      price,
      description,
      category,
      keywords,
      discount,
      images: finalImages,
      sellerId: session.user.id,
    });

    return NextResponse.json(newBook, { status: 201 });
  } catch (error) {
    console.error('Books POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}
