import { useState, useEffect, useCallback } from 'preact/hooks';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';
import '../styles/glightbox-custom.css';

// This is a simple image component for images loaded on the client.
// It mimics the output of Astro's <Image> component.
const ClientImage = ({ src, width, height, alt }) => (
	<img
		src={src}
		width={width}
		height={height}
		alt={alt}
		loading="lazy"
		decoding="async"
		class="w-full h-full object-cover rounded-sm shadow-sm hover:shadow-lg transition-shadow"
	/>
);

export default function PhotoGrid({ initialImages, totalImages, pageSize, collection }) {
	const [images, setImages] = useState(initialImages);
	const [page, setPage] = useState(2); // The next page to fetch is page 2
	const [isLoading, setIsLoading] = useState(false);
	const [lightbox, setLightbox] = useState(null);

	const hasMoreImages = images.length < totalImages;

	// This function re-runs your masonry/grid layout script.
	const runLayoutScript = useCallback(() => {
		// We dynamically import the script to execute it.
		import('../scripts/photo-grid.js');
	}, []);

	// Initialize GLightbox and run the layout script on first load
	useEffect(() => {
		const lb = GLightbox({ selector: '.glightbox' });
		setLightbox(lb);
		runLayoutScript();
		
		return () => lb.destroy(); // Cleanup on component unmount
	}, [runLayoutScript]);

	// This effect runs whenever the `images` array changes.
	useEffect(() => {
		if (lightbox) {
			// When new images are added, we need to refresh GLightbox
			// and re-run the layout script.
			lightbox.reload();
			runLayoutScript();
		}
	}, [images, lightbox, runLayoutScript]);


	const loadMoreImages = async () => {
		if (isLoading || !hasMoreImages) return;
		setIsLoading(true);

		// Build the API URL, adding the collection param only if it exists
		const collectionParam = collection ? `&collection=${collection}` : '';
		const apiUrl = `/api/images?page=${page}&limit=${pageSize}${collectionParam}`;

		try {
			const response = await fetch(apiUrl);
			const data = await response.json();

			if (data.images && data.images.length > 0) {
				// Append new images to the existing list
				setImages((prevImages) => [...prevImages, ...data.images]);
				setPage((prevPage) => prevPage + 1);
			}
		} catch (error) {
			console.error("Failed to fetch more images:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<section id="photo-grid" class="relative w-full mx-auto overflow-hidden">
				{images.map((image) => (
					<a
						key={image.src.src || image.src} // Works for both server & client loaded images
						href={image.src.src || image.src}
						class="photo-item glightbox absolute transition-transform hover:scale-[1.02] hover:z-10"
						data-gallery="gallery1"
						data-type="image"
						data-glightbox={image.description ? `title: ${image.description}` : undefined}
					>
						{/* Use the standard Astro <Image> for initial load, and <ClientImage> for client-side loaded images */}
						<ClientImage
							src={image.src.src || image.src}
							width={image.src.width || image.width}
							height={image.src.height || image.height}
							alt={image.title}
						/>
					</a>
				))}
			</section>

			{hasMoreImages && (
				<div class="text-center mt-12">
					<button
						onClick={loadMoreImages}
						disabled={isLoading}
						class="px-6 py-3 bg-black text-white font-semibold rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
					>
						{isLoading ? 'Se încarcă...' : 'Încarcă mai multe'}
					</button>
				</div>
			)}
		</>
	);
}