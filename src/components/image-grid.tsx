
'use client';

import type { TrendyPost } from '@/services/subreddit-scraper';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

interface ImageGridProps {
  images: TrendyPost[];
}

export default function ImageGrid({ images }: ImageGridProps) {
  if (!images || images.length === 0) {
    return null; // Handled by parent component now
  }

  const placeholderUrl = 'https://picsum.photos/seed/placeholder/400/400'; // Fallback if server misses sanitization

  return (
    // Added TooltipProvider to wrap the grid
    <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((post, index) => {
            // imageUrl is now assumed to be valid and allowed by the server action
            // If server action filters out invalid URLs, this check is less critical, but kept as safeguard
            const imageUrlToUse = post.imageUrl || placeholderUrl;
            const imageTitle = post.title || 'Scraped image';
            const isPlaceholder = imageUrlToUse === placeholderUrl;

            // Basic check if URL is truly empty/null just in case
            if (!imageUrlToUse) {
                console.warn(`Image post at index ${index} has missing URL.`);
                // Render a placeholder card for missing URLs
                return (
                     <Card key={`missing-${index}`} className="overflow-hidden shadow-md flex items-center justify-center bg-muted aspect-square rounded-lg">
                         <p className="text-xs text-muted-foreground p-2 text-center">Image URL missing or invalid</p>
                     </Card>
                );
            }

            return (
              <Card key={index} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 group rounded-lg flex flex-col">
                <CardContent className="p-0 aspect-square relative w-full">
                   <Image
                      src={imageUrlToUse}
                      alt={imageTitle}
                      fill // Use fill for responsive aspect ratio
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw" // Adjusted sizes
                      style={{ objectFit: 'cover' }} // Ensures image covers the area
                      className={`transition-transform duration-300 ease-in-out group-hover:scale-105 ${isPlaceholder ? 'opacity-70' : ''}`} // Dim placeholder slightly
                      // Improved error handling: Display a placeholder visual within the card on error
                      onError={(e) => {
                        console.warn(`Failed to load image: ${imageUrlToUse}`);
                        // Target the img element directly and replace src, or hide it and show a placeholder div
                        e.currentTarget.style.display = 'none'; // Hide the broken image
                        // Optionally add a placeholder element dynamically, or have one ready with CSS
                        const placeholderDiv = document.createElement('div');
                        placeholderDiv.className = 'absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs p-2 text-center';
                        placeholderDiv.textContent = 'Image failed to load';
                        e.currentTarget.parentElement?.appendChild(placeholderDiv);
                      }}
                    />
                </CardContent>
                {/* Use Tooltip for potentially long titles */}
                 <CardFooter className="p-2 bg-card/80 backdrop-blur-sm mt-auto">
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <p className="text-xs text-foreground truncate w-full" aria-label={imageTitle}> {/* Use foreground for better contrast */}
                         {imageTitle}
                       </p>
                     </TooltipTrigger>
                     <TooltipContent side="bottom" align="start">
                       <p className="max-w-xs">{imageTitle}</p> {/* Limit width in tooltip */}
                     </TooltipContent>
                   </Tooltip>
                 </CardFooter>
              </Card>
            );
          })}
        </div>
    </TooltipProvider>
  );
}
