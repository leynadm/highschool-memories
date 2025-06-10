import path from 'path';
import {
	type Collection,
	type GalleryData,
	type GalleryImage,
	type Image,
	type ImageModule,
	loadGallery,
} from './galleryData.ts';

/**
 * Error class for image-related errors
 */
export class ImageStoreError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageStoreError';
	}
}

/**
 * Import all images from /src directory
 */
const imageModules = import.meta.glob('/src/**/*.{jpg,jpeg,png,gif}', {
	eager: true,
});

const defaultGalleryPath = 'src/gallery/gallery.yaml';

export const featuredCollectionId = 'featured';
const builtInCollections = [featuredCollectionId];

/**
 * Options for retrieving images from the gallery
 * @property {string} [galleryPath] - Path to the gallery YAML file
 * @property {string} [collection] - Collection name to filter images by
 * @property {string} [sortBy] - Property to sort images by (e.g., 'captureDate')
 * @property {'asc' | 'desc'} [order] - Sort order, either ascending or descending
 */
interface GetImagesOptions {
	galleryPath?: string;
	collection?: string;
	sortBy?: 'captureDate';
	order?: 'asc' | 'desc';
	limit?: number; // ADDED
	page?: number;  // ADDED
}

/**
 * Retrieves images from a specified gallery path and optionally filters them by a collection name.
 *
 * @param {GetImagesOptions} [options={}] - Configuration options for retrieving the images.
 * @param {string} [options.galleryPath=defaultGalleryPath] - The path to the gallery to load the images from.
 * @param {string} [options.collection] - The name of the collection to filter images by. If not provided, all images are retrieved.
 * @returns {Promise<Image[]>} Retrieved images.
 * @throws {ImageStoreError} Throws an error if loading the gallery data fails.
 */
export const getImages = async (
	options: GetImagesOptions = {},
): Promise<{ images: Image[]; total: number }> => { // CHANGED return type
	const {
		galleryPath = defaultGalleryPath,
		collection,
		limit,
		page = 1 // ADDED: Default to page 1
	} = options;

	try {
		// 1. Load, filter, and sort the raw gallery image data (not the final processed images)
		let galleryImages = (await loadGalleryData(galleryPath)).images;
		galleryImages = filterImagesByCollection(collection, galleryImages);
		galleryImages = sortImages(galleryImages, options);

		// 2. Get the total count *before* slicing for pagination
		const total = galleryImages.length; // ADDED

		// 3. Slice the array for the current page if limit is provided
		let paginatedGalleryImages = galleryImages;
		if (limit) { // ADDED pagination logic
			const offset = (page - 1) * limit;
			paginatedGalleryImages = galleryImages.slice(offset, offset + limit);
		}

		// 4. Process only the images needed for the current page. This is very efficient!
		const processedImages = processImages(paginatedGalleryImages, galleryPath);

		// 5. Return the new data structure
		return { images: processedImages, total }; // CHANGED

	} catch (error) {
		throw new ImageStoreError(
			`Failed to load images from ${galleryPath}: ${getErrorMsgFrom(error)}`,
		);
	}
};

function getErrorMsgFrom(error: unknown) {
	return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Loads collections data from YAML file
 * @throws {ImageStoreError} If YAML file cannot be read or parsed
 * @param galleryPath
 */
const loadGalleryData = async (galleryPath: string): Promise<GalleryData> => {
	try {
		const gallery = await loadGallery(galleryPath);
		validateGalleryData(gallery);
		return gallery;
	} catch (error) {
		throw new ImageStoreError(
			`Failed to load gallery data from ${galleryPath}: ${getErrorMsgFrom(error)}`,
		);
	}
};

function filterImagesByCollection(collection: string | undefined, images: GalleryImage[]) {
	if (collection) {
		images = images.filter((image) => image.meta.collections.includes(collection));
	}
	return images;
}

function validateGalleryData(gallery: GalleryData) {
	const collectionIds = gallery.collections.map((col) => col.id).concat(builtInCollections);
	for (const image of gallery.images) {
		const invalidCollections = image.meta.collections.filter((col) => !collectionIds.includes(col));
		if (invalidCollections.length > 0) {
			throw new ImageStoreError(
				`Invalid collection(s) [${invalidCollections.join(', ')}] referenced in image: ${image.path}`,
			);
		}
	}
}

function sortImages(images: GalleryImage[], options: GetImagesOptions) {
	const { sortBy, order } = options;
	let result: GalleryImage[] = images;
	if (sortBy) {
		result.sort((a, b) => {
			const dateA = a.exif?.captureDate?.getTime() || 0;
			const dateB = b.exif?.captureDate?.getTime() || 0;
			return dateA - dateB;
		});
	}
	if (order === 'desc') {
		result.reverse();
	}
	return result;
}

/**
 * Processes gallery images and returns an array of Image objects
 * @param {GalleryImage[]} images - Array of images to process
 * @param {string} galleryPath - Path to the collections directory
 * @returns {Image[]} Array of processed images with metadata
 * @throws {ImageStoreError} If an image module cannot be found
 */
const processImages = (images: GalleryImage[], galleryPath: string): Image[] => {
	return images.reduce<Image[]>((acc, imageEntry) => {
		const imagePath = path.posix.join('/', path.parse(galleryPath).dir, imageEntry.path);
		try {
			acc.push(createImageDataFor(imagePath, imageEntry));
		} catch (error) {
			console.warn(`[WARN] ${getErrorMsgFrom(error)}`);
		}
		return acc;
	}, []);
};

/**
 * Creates image data for a given image path and entry
 * @param {string} imagePath - Path to the image file
 * @param {GalleryImage} img - Gallery image entry
 * @returns {Image} Processed image with metadata
 * @throws {ImageStoreError} If image module cannot be found
 */
const createImageDataFor = (imagePath: string, img: GalleryImage): Image => {
	const imageModule = imageModules[imagePath] as ImageModule | undefined;

	if (!imageModule) {
		throw new ImageStoreError(`Image not found: ${imagePath}`);
	}

	return {
		src: imageModule.default,
		title: img.meta.title,
		description: img.meta.description,
		collections: img.meta.collections,
	};
};

/**
 * Retrieves all collections from the gallery
 * @param galleryPath - Path to the gallery YAML file
 * @returns {Promise<Collection[]>} Array of collections
 */
export const getCollections = async (
	galleryPath: string = defaultGalleryPath,
): Promise<Collection[]> => {
	return (await loadGalleryData(galleryPath)).collections;
};
