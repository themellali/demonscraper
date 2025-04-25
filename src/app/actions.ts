
'use server';

import type { TrendyPost } from '@/services/subreddit-scraper';
import { scrapeTrendyImages } from '@/services/subreddit-scraper'; // Now uses Reddit API
import { z } from 'zod';
import nextConfig from '../../next.config.js'; // Import config - use .js extension

interface ScrapeState {
  images: TrendyPost[] | null;
  error: string | null;
  message: string | null; // Add message field
  timestamp: number;
}

const urlSchema = z.string().url({ message: "Please enter a valid URL." })
  .refine(url => url.includes('reddit.com/r/'), {
    message: "Please enter a valid Reddit subreddit URL (e.g., https://www.reddit.com/r/...)."
  });

// Schema for limit, ensuring it's a positive number within a reasonable range
const limitSchema = z.coerce // Coerce string from FormData to number
  .number()
  .int({ message: "Limit must be a whole number." })
  .positive({ message: "Limit must be positive." })
  .min(1, { message: "Limit must be at least 1." })
  .max(100, { message: "Maximum limit is 100." }) // Reddit API limit
  .default(25); // Default limit if not provided or invalid


// --- Image URL Validation/Sanitization Helpers ---
function getAllowedHostnames(): Set<string> {
    const allowed = new Set<string>([
        'i.redd.it',
        'preview.redd.it',
    ]);

    const configHostnames = nextConfig.images?.remotePatterns
        ?.map(pattern => pattern.hostname)
        .filter((hostname): hostname is string => !!hostname) ?? [];

    configHostnames.forEach(host => allowed.add(host));
    allowed.add('picsum.photos');

    return allowed;
}
const placeholderImageUrl = `https://picsum.photos/seed/placeholder/400/400`;

function isValidAndAllowedUrl(imageUrl: string | null | undefined, allowedHostnames: Set<string>): boolean {
    if (!imageUrl) return false;
    try {
        const url = new URL(imageUrl);
        return (url.protocol === "http:" || url.protocol === "https:") && allowedHostnames.has(url.hostname);
    } catch (_) {
        return false;
    }
}

function sanitizePosts(posts: TrendyPost[], allowedHostnames: Set<string>): TrendyPost[] {
    return posts.map(post => ({
        ...post,
        imageUrl: isValidAndAllowedUrl(post.imageUrl, allowedHostnames) ? post.imageUrl : placeholderImageUrl,
    })).filter(post => post.imageUrl !== placeholderImageUrl);
}
// --- End Image URL Validation/Sanitization Helpers ---


export async function scrapeSubredditAction(
  prevState: ScrapeState,
  formData: FormData
): Promise<ScrapeState> {
  const subredditUrl = formData.get('subredditUrl');
  const limitValue = formData.get('limit'); // Get limit from form data

  // --- Validate URL ---
  const urlParseResult = urlSchema.safeParse(subredditUrl);
  if (!urlParseResult.success) {
    const errorMessage = urlParseResult.error.errors[0]?.message || "Invalid URL provided.";
     return {
        ...prevState, // Keep previous images/messages if any
        images: null, // Clear images on new validation error
        error: errorMessage,
        message: null, // Clear message
        timestamp: Date.now(),
     };
  }
  const validatedUrl = urlParseResult.data;

  // --- Validate Limit ---
  const limitParseResult = limitSchema.safeParse(limitValue);
  if (!limitParseResult.success) {
      const errorMessage = limitParseResult.error.errors[0]?.message || "Invalid limit value provided.";
      return {
          ...prevState,
          images: null,
          error: errorMessage,
          message: null,
          timestamp: Date.now(),
      };
  }
  const validatedLimit = limitParseResult.data;

  // --- Check API Credentials ---
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
       return {
           ...prevState,
           images: null,
           error: "Reddit API credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET) are not configured on the server. Please set them in the .env file.",
           message: null,
           timestamp: Date.now(),
       };
  }

  // --- Perform Scraping ---
  try {
    // Call the API-based function with validated URL and limit
    const rawPosts = await scrapeTrendyImages(validatedUrl, validatedLimit);

    if (rawPosts === null) {
        return {
            ...prevState,
            images: null,
            error: "Failed to retrieve data from Reddit API. The subreddit might be inaccessible or an API error occurred.",
            message: null,
            timestamp: Date.now(),
        };
    }

     if (rawPosts.length === 0) {
        return {
            images: [],
            error: null,
            message: `Found 0 suitable image posts in r/${validatedUrl.split('/r/')[1]?.split('/')[0]} with the current filters.`, // More informative message
            timestamp: Date.now(),
        };
     }

    const allowedHostnames = getAllowedHostnames();
    const sanitizedPosts = sanitizePosts(rawPosts, allowedHostnames);

     if (sanitizedPosts.length === 0 && rawPosts.length > 0) {
       return {
         images: [],
         error: `Found ${rawPosts.length} posts via API, but their image URLs were not from allowed domains (check next.config.js and ensure i.redd.it, preview.redd.it are included) or were filtered out.`,
         message: null,
         timestamp: Date.now(),
       };
     }

    // --- Success State ---
    return {
      images: sanitizedPosts,
      error: null,
      message: `Successfully fetched ${sanitizedPosts.length} images.`, // Success message
      timestamp: Date.now(),
    };

  } catch (error) {
    console.error("Reddit API action error:", error);
    let errorMessage = "An unexpected error occurred while fetching data from Reddit.";
    if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes("401")) {
            errorMessage = "Failed to authenticate with Reddit API (401 Unauthorized). Please check your REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in the .env file.";
        }
    }
    return {
      ...prevState,
      images: null,
      error: errorMessage,
      message: null,
      timestamp: Date.now(),
    };
  }
}
