
/**
 * @fileoverview Service for fetching trendy images from a subreddit using the Reddit API.
 */

/**
 * Represents a trendy post retrieved from the Reddit API.
 */
export interface TrendyPost {
  /**
   * The direct URL of the image.
   */
  imageUrl: string;

  /**
   * The title of the Reddit post.
   */
  title: string;
}

// --- Reddit API Types (simplified) ---
interface RedditTokenResponse {
  access_token: string;
  token_type: string; // Should be "bearer"
  expires_in: number; // Duration in seconds (usually 3600)
  scope: string;
}

interface RedditPostData {
  title: string;
  name: string; // Fullname, e.g., t3_abcde
  url: string;
  thumbnail?: string;
  is_video: boolean;
  is_gallery?: boolean;
  // Add other fields if needed
}

interface RedditListingChild {
  kind: string; // e.g., "t3" for posts
  data: RedditPostData;
}

interface RedditListingData {
  after: string | null; // For pagination
  dist: number;
  modhash: string;
  geo_filter: string | null;
  children: RedditListingChild[];
  before: string | null; // For pagination
}

interface RedditApiResponse {
  kind: string; // e.g., "Listing"
  data: RedditListingData;
}

// --- End Reddit API Types ---

// --- Simple In-Memory Token Cache ---
let redditAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;
// --- End Token Cache ---


/**
 * Generates a unique User-Agent string required by the Reddit API.
 * Format: <platform>:<app ID>:<version string> (by /u/<reddit username>)
 * Replace placeholders with actual values if known, otherwise use defaults.
 * IMPORTANT: Reddit uses the User-Agent for tracking and enforcing API rules.
 * Using a descriptive and unique User-Agent is crucial.
 * @returns A formatted User-Agent string.
 */
function getUserAgent(): string {
    const platform = "web"; // Or 'node', 'browser', etc.
    const appId = process.env.REDDIT_CLIENT_ID || "unknown-app-id"; // Use env var if available
    const version = "1.0.0"; // Your app's version
    const redditUsername = "your-reddit-username"; // CHANGE THIS if applicable, otherwise remove 'by /u/...' part or use a placeholder app name
    // return `${platform}:${appId}:${version} (by /u/${redditUsername})`;
     return `${platform}:${appId}:${version} (NextJS Subreddit Scraper)`; // Example without username
}


/**
 * Retrieves an Application Only OAuth access token from Reddit.
 * Uses client credentials (ID and Secret) from environment variables.
 * Caches the token in memory until it expires.
 * @returns A promise resolving to the access token string.
 * @throws An error if credentials are missing or token fetch fails.
 */
async function getRedditAccessToken(): Promise<string> {
  const now = Date.now();

  // Check cache first
  if (redditAccessToken && tokenExpiryTime && now < tokenExpiryTime) {
    // console.log("Using cached Reddit access token.");
    return redditAccessToken;
  }

  // console.log("Fetching new Reddit access token...");
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET environment variables are not set.");
    throw new Error("Reddit API credentials are missing. Please configure them in your .env file.");
  }

  const tokenUrl = "https://www.reddit.com/api/v1/access_token";
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': getUserAgent(),
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to get Reddit access token. Status: ${response.status}. Body: ${errorBody}`);
      // More specific error for 401 Unauthorized
      if (response.status === 401) {
        throw new Error(`Failed to authenticate with Reddit API. Status: ${response.status} (Unauthorized). Please verify your REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.`);
      }
      throw new Error(`Failed to authenticate with Reddit API. Status: ${response.status}`);
    }

    const tokenData = (await response.json()) as RedditTokenResponse;

    if (tokenData.token_type !== 'bearer') {
      console.error("Received unexpected token type:", tokenData.token_type);
      throw new Error("Failed to get a valid bearer token from Reddit.");
    }

    redditAccessToken = tokenData.access_token;
    // Set expiry time slightly before actual expiry (e.g., 5 minutes buffer)
    tokenExpiryTime = Date.now() + (tokenData.expires_in - 300) * 1000;

    // console.log("Successfully obtained new Reddit access token.");
    return redditAccessToken;
  } catch (error) {
    console.error("Error fetching Reddit access token:", error);
    // Clear potentially stale cache on error
    redditAccessToken = null;
    tokenExpiryTime = null;
    // Re-throw a more user-friendly error or the original one
    if (error instanceof Error && error.message.includes('Failed to authenticate')) {
        throw error;
    }
    throw new Error("Could not connect to Reddit API to get access token.");
  }
}

/**
 * Extracts the subreddit name from a full URL.
 * @param url The full subreddit URL (e.g., https://www.reddit.com/r/pics/).
 * @returns The subreddit name (e.g., "pics") or null if the URL is invalid.
 */
function extractSubredditName(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        const pathParts = parsedUrl.pathname.split('/').filter(part => part !== ''); // Split and remove empty parts
        // Check if path starts with 'r' and has a name after it
        if (pathParts.length >= 2 && pathParts[0].toLowerCase() === 'r') {
            return pathParts[1];
        }
        return null;
    } catch (e) {
        // Invalid URL format
        return null;
    }
}


/**
 * Asynchronously fetches images from trendy posts in a given subreddit using the Reddit API.
 * Retrieves posts from the 'hot' listing.
 *
 * @param subredditUrl The full URL of the subreddit (e.g., https://www.reddit.com/r/pics/).
 * @param limit The maximum number of posts to fetch (default 25, max 100 per Reddit API).
 * @returns A promise that resolves to an array of TrendyPost objects or null if the subreddit is invalid/inaccessible.
 * @throws An error if API authentication fails or a critical API error occurs.
 */
export async function scrapeTrendyImages(subredditUrl: string, limit: number = 25): Promise<TrendyPost[] | null> {
  const subredditName = extractSubredditName(subredditUrl);

  if (!subredditName) {
    console.error(`Invalid subreddit URL format: ${subredditUrl}`);
    throw new Error("Invalid subreddit URL format. Please use the format: https://www.reddit.com/r/subredditname/");
  }

  console.log(`Fetching trendy images from r/${subredditName} using Reddit API...`);

  try {
    const accessToken = await getRedditAccessToken();
    const apiUrl = `https://oauth.reddit.com/r/${subredditName}/hot?limit=${Math.min(limit, 100)}`; // Use oauth domain for authenticated requests

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': getUserAgent(),
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch r/${subredditName} data. Status: ${response.status} ${response.statusText}`);
       if (response.status === 401) {
         throw new Error(`Reddit API authentication failed (401 Unauthorized). This usually means your access token is invalid or expired. The service will attempt to refresh it, but if this persists, check your API credentials.`);
       }
       if (response.status === 404) {
         throw new Error(`Subreddit 'r/${subredditName}' not found or is private (404).`);
       }
       if (response.status === 403) {
         // This might indicate invalid token, permissions, or API rule violation
         throw new Error(`Access denied (403) when fetching r/${subredditName}. Check API key permissions or User-Agent.`);
       }
       if (response.status === 429) {
          throw new Error(`Rate limited by Reddit (429 Too Many Requests). Please wait and try again later.`);
       }
      // Generic error for other failed statuses
      throw new Error(`Failed to fetch data from Reddit API. Status: ${response.status}`);
    }

    const listing = (await response.json()) as RedditApiResponse;

    if (listing.kind !== 'Listing' || !listing.data || !listing.data.children) {
      console.error("Unexpected API response structure:", listing);
      throw new Error("Received invalid data structure from Reddit API.");
    }

    const posts: TrendyPost[] = [];
    listing.data.children.forEach(child => {
      if (child.kind === 't3' && child.data) { // Ensure it's a post and has data
        const postData = child.data;

        // Filter out videos, stickied posts (often meta), galleries (complex), and NSFW if desired
        if (!postData.is_video && !postData.is_gallery /* && !postData.over_18 */) {
          // Check if the 'url' field points directly to an image (common for direct uploads)
          const url = postData.url;
          if (url && /\.(jpg|jpeg|png|gif)$/i.test(url)) {
             // Basic check for common image extensions
             if (!posts.some(p => p.imageUrl === url)) { // Basic deduplication
                posts.push({
                  imageUrl: url,
                  title: postData.title || 'Untitled Post',
                });
             }
          }
           // Optional: Could add logic here to check `postData.preview.images` for gallery previews or other image sources
           // if the main `url` isn't a direct image link. This gets more complex.
        }
      }
    });

    console.log(`Successfully retrieved ${posts.length} image posts from r/${subredditName} via API.`);
    if (posts.length === 0 && listing.data.children.length > 0) {
        console.warn(`Found ${listing.data.children.length} posts, but none met the image criteria (not video, gallery, direct image URL).`);
    }

    return posts;

  } catch (error) {
    console.error(`Error fetching from Reddit API for r/${subredditName}:`, error instanceof Error ? error.message : error);

     // If it's one of our specific thrown errors, re-throw it
     if (error instanceof Error && (
         error.message.includes("credentials are missing") ||
         error.message.includes("Failed to authenticate") || // Covers the 401 case too
         error.message.includes("Could not connect") ||
         error.message.includes("Invalid subreddit URL format") ||
         error.message.includes("(404)") ||
         error.message.includes("(403)") ||
         error.message.includes("(429)") ||
         error.message.includes("invalid data structure")
     )) {
        throw error;
     }

    // Generic fallback error
    throw new Error("An unexpected error occurred while communicating with the Reddit API.");
    // Returning null might hide the underlying issue, throwing is often better here.
    // return null;
  }
}
