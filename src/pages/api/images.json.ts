import type { APIRoute } from 'astro';
import { getImages } from '../../data/imageStore'; // Adjust the path if necessary

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Get query parameters for pagination and filtering
  const collection = params.get('collection') || undefined;
  const page = parseInt(params.get('page') || '1', 10);
  const limit = parseInt(params.get('limit') || '30', 10);

  try {
    // Fetch all images for the given collection
    const allImages = await getImages(collection ? { collection } : {});

    // Calculate the slice of images for the current page
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);

    // We need to return data that can be stringified, so we'll just send the necessary image properties.
    // Astro's <Image> component can't be used in an API route, so we send back the raw source.
    const responseData = paginatedImages.map(img => ({
      src: img.src.src, // Assuming `img.src` is an object from `getImage()` with a `src` property
      width: img.src.width,
      height: img.src.height,
      alt: img.title,
      description: img.description,
    }));
    
    return new Response(JSON.stringify({
      images: responseData,
      // Let the client know if there are more images to fetch
      hasMore: endIndex < allImages.length,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};