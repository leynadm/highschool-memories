import type { APIRoute } from 'astro';
import { getImages } from '../../data/imageStore';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const collection = url.searchParams.get('collection') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '30', 10);

    const { images, total } = await getImages({ collection, page, limit });

    // Serialize the image data to be JSON-friendly
    const serializableImages = images.map(img => ({
        src: img.src.src, // Send only the src string
        width: img.src.width,
        height: img.src.height,
        title: img.title,
        description: img.description,
    }));

    return new Response(
        JSON.stringify({ images: serializableImages, total }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
};