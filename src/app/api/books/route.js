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
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const lat = latParam ? parseFloat(latParam) : null;
    const lng = lngParam ? parseFloat(lngParam) : null;
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const city = searchParams.get('city');

    let whereClause = {};
    if (query) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { keywords: { [Op.like]: `%${query}%` } },
        ],
      };
    }
    if (category) {
      whereClause.category = category;
    }

    // Geolocation Search
    // Since we are using SQLite/Sequelize, we can't do efficient distance sorting in DB easily without spatial extensions.
    // However, we can filter by bounding box if lat/lng are provided to reduce the set.
    // ~111km per degree latitude.
    // Let's grab books within ~50km box if lat/lng provided, then sort in JS.
    // If pagination is requested with location sorting, it becomes tricky because we need all results to sort them first.
    // For now, if lat/lng provided, we fetch all (with some limit) and sort, then paginate in memory.
    // If no lat/lng, we use DB pagination.

    let include = [{ model: User, as: 'seller', attributes: ['name', 'latitude', 'longitude', 'city', 'state'] }];
    let order = [['createdAt', 'DESC']];

    if (city) {
      include[0].where = { city: city };
    }

    if (lat !== null && lng !== null) {
        // Optimization: Pre-filter users (sellers) who are roughly nearby if possible.
        // But since seller info is in User table and we are querying Books, we'd need to filter on the include.
        // Doing this efficiently in Sequelize with include where is okay.

        // 1 degree lat ~= 111 km. 1 degree lon ~= 111 * cos(lat).
        // Let's say we want within 500km initially to be safe? Or just fetch all.
        // If dataset is small (<1000 books), fetching all is fine.
        // If dataset is large, we MUST do bounding box.

        const R = 6371;
        const maxDist = 500; // 500 km radius for initial fetch
        const latDelta = maxDist / 111;
        // approximate lonDelta
        const lonDelta = maxDist / (111 * Math.cos(lat * (Math.PI/180)));

        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLon = lng - lonDelta;
        const maxLon = lng + lonDelta;

        if (!include[0].where) include[0].where = {};
        include[0].where = {
            ...include[0].where,
            latitude: { [Op.between]: [minLat, maxLat] },
            longitude: { [Op.between]: [minLon, maxLon] }
        };
    }

    // If we are doing location based sort, we need to fetch all matching candidates first, sort, then paginate.
    // If not, use DB pagination.

    const isLocationSort = lat !== null && lng !== null;

    const queryOptions = {
        where: whereClause,
        include: include,
        order: order,
    };

    if (!isLocationSort) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
    }

    const { count, rows: books } = await Book.findAndCountAll(queryOptions);

    let results = books.map(book => book.toJSON());

    if (isLocationSort) {
      results = results.map(book => {
        const seller = book.seller;
        if (seller && seller.latitude && seller.longitude) {
          const dist = getDistanceFromLatLonInKm(lat, lng, seller.latitude, seller.longitude);
          return { ...book, distance: dist };
        }
        return { ...book, distance: null };
      }).sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      // Manual pagination
      const total = results.length;
      results = results.slice(offset, offset + limit);

      return NextResponse.json(results, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'X-Total-Count': total.toString(),
            'X-Page': page.toString(),
            'X-Total-Pages': Math.ceil(total / limit).toString()
          },
      });
    }

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Total-Count': count.toString(),
        'X-Page': page.toString(),
        'X-Total-Pages': Math.ceil(count / limit).toString()
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
    console.log('DEBUG BOOK CREATE - Discount received:', discount);
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

    // Construct final images list based on order
    let finalImages = [];
    if (imageOrder.length > 0) {
      let newImgIdx = 0;
      finalImages = imageOrder.map(item => {
        if (item === 'new-image-placeholder') {
          return newImagePaths[newImgIdx++] || null;
        }
        return item; // Should be null for POST usually, unless we support copying? For POST it's mostly new.
        // Actually for POST, if we only have new images, imageOrder might be ['new-image-placeholder', 'new-image-placeholder']
        // But wait, the frontend might send 'new-123' IDs.
        // Let's stick to the plan: Frontend sends 'new-image-placeholder' for new files in order.
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
      sellerId: session.user.id, // Admin can add books? User said "Admin can also updaet,delete and update all books of seller". Usually Admin manages. If Admin adds, who is seller? 
      // Assuming Admin adds for themselves or we need a sellerId param.
      // For now, assume logged in user is the seller.
    });

    return NextResponse.json(newBook, { status: 201 });
  } catch (error) {
    console.error('Books POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371.0710; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);  // deg2rad below
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
