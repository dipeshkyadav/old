import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Op } from 'sequelize';
import sequelize from '@/lib/db';
import { Book, User } from '@/models/index';
import { authOptions } from '../auth/[...nextauth]/route';
import Fuse from 'fuse.js';

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
    // If using Fuse.js (Typo-tolerant) with a query, we skip SQL filtering on text fields
    // and instead fetch a larger set to filter in memory.
    // However, if no query, or if filtering by category only, we use SQL.

    // Exact category filter if provided
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
      const range = 0.5; // ~55km
      include[0].where = {
        latitude: { [Op.between]: [lat - range, lat + range] },
        longitude: { [Op.between]: [lng - range, lng + range] }
      };
    }

    // Determine fetch strategy
    let useFuse = false;
    if (query) {
      useFuse = true;
      // We don't apply SQL LIKE if using Fuse, we fetch more rows and filter.
      // But we still apply category filter in SQL.
    }

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause, // Only category if query exists
      include: include,
      order: order,
      // If using Fuse, we fetch ALL matches (up to reasonable limit) then filter
      limit: useFuse ? 500 : ((lat && lng) ? undefined : limit),
      offset: useFuse ? 0 : ((lat && lng) ? undefined : offset),
      distinct: true,
    });

    let results = rows.map(book => book.toJSON());

    // 1. Fuse.js Fuzzy Search
    if (useFuse && query) {
      const options = {
        keys: ['title', 'description', 'keywords', 'category', 'seller.city'],
        threshold: 0.4, // 0.0 is perfect match, 1.0 is match anything
        includeScore: true
      };
      const fuse = new Fuse(results, options);
      const fuseResults = fuse.search(query);
      results = fuseResults.map(result => result.item);
    }

    // 2. Geolocation Sorting
    if (lat && lng) {
      results = results.map(book => {
        const seller = book.seller;
        if (seller && seller.latitude && seller.longitude) {
          const dist = getDistanceFromLatLonInKm(lat, lng, seller.latitude, seller.longitude);
          return { ...book, distance: dist };
        }
        return { ...book, distance: null };
      })
      .filter(b => b.distance !== null)
      .sort((a, b) => a.distance - b.distance);
    }

    // 3. Manual Pagination (if Fuse or Geo was used)
    let total = count;
    if (useFuse) {
      total = results.length; // Count changes after fuzzy filter
    }

    // If we did in-memory processing (Fuse or Geo), we need to slice manually
    if (useFuse || (lat && lng)) {
      results = results.slice(offset, offset + limit);
    }

    return NextResponse.json({
      data: results,
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
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
