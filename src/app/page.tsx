
'use client';

import type { TrendyPost } from '@/services/subreddit-scraper';
import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { scrapeSubredditAction } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'; // Removed ThumbsUp as it's not used for toast
import ImageGrid from '@/components/image-grid';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"; // Import useToast


interface ScrapeState {
  images: TrendyPost[] | null;
  error: string | null;
  message: string | null;
  timestamp: number;
}

const initialState: ScrapeState = {
  images: null,
  error: null,
  message: null,
  timestamp: Date.now(),
};

// Limit options
const limitOptions = [10, 25, 50, 100];
const defaultLimit = 25; // Default limit value

// Submit Button Component using useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending} // Use aria-disabled for accessibility
      className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-4"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Fetching...</span>
        </>
      ) : (
        <span>Get Images</span>
      )}
    </Button>
  );
}


export default function Home() {
  const [state, formAction] = useActionState(scrapeSubredditAction, initialState);
  const [showInitialMessage, setShowInitialMessage] = React.useState(true);
  const formRef = React.useRef<HTMLFormElement>(null);
  const { toast } = useToast(); // Initialize useToast hook

  // Effect to show toast notification on success
  React.useEffect(() => {
    if (state.message && !state.error) {
      toast({
        title: "Success",
        description: state.message,
        duration: 2000, // Disappear after 2 seconds
      });
      // Optionally reset the message in the state after showing the toast
      // to prevent it from showing again on re-renders without new action
      // formAction({ type: 'resetMessage' }); // This would require modifying the action
    }
  }, [state.message, state.error, state.timestamp, toast]); // Depend on timestamp to re-trigger on new actions


  React.useEffect(() => {
    if (state.timestamp !== initialState.timestamp && (state.images !== null || state.error !== null)) {
       setShowInitialMessage(false);
    }
  }, [state.timestamp, state.images, state.error]);

   // Effect to inject the ad script
   React.useEffect(() => {
    const scriptId = 'vebw-ad-script';
    // Check if the script already exists
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.innerHTML = `
      (function(vebw){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = vebw || {};
        s.src = "//informalcelebration.com/cdD.9b6Tba2u5llySOWbQp9WNCj/MlwBMwzOI/4VN/Sy0I2DMKz-A/zGMIjSg_2v";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        if (l && l.parentNode) {
             l.parentNode.insertBefore(s, l);
        } else {
             // Fallback if last script isn't found (less likely but safe)
             d.head.appendChild(s);
        }

      })({})
    `;
    // Append the container script to the body or head
    document.body.appendChild(script);
  }, []); // Empty dependency array ensures this runs only once on mount



  return (
    <>
     <main className="container mx-auto flex min-h-screen flex-col items-center p-4 sm:p-8">
      <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-8">

        {/* Central Content Area */}
        <div className="flex flex-col items-center w-full">
          <Card className="w-full max-w-3xl shadow-lg mb-8 rounded-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-center text-foreground">Subreddit Image Demon</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form ref={formRef} action={formAction} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
                    {/* Subreddit URL Input */}
                    <div className="flex-grow space-y-2">
                      <Label htmlFor="subredditUrl" className="text-sm font-medium">Subreddit URL</Label>
                      <Input
                        id="subredditUrl"
                        name="subredditUrl"
                        type="url"
                        placeholder="e.g., https://www.reddit.com/r/pics/"
                        required
                        className="bg-input text-foreground placeholder:text-muted-foreground rounded-md text-base"
                      />
                    </div>

                     {/* Limit Dropdown */}
                     <div className="space-y-2 sm:w-auto w-full">
                        <Label htmlFor="limit" className="text-sm font-medium">Max Images</Label>
                        <Select name="limit" defaultValue={defaultLimit.toString()}>
                          <SelectTrigger id="limit" className="w-full sm:w-[120px] bg-input text-foreground rounded-md">
                            <SelectValue placeholder="Select limit" />
                          </SelectTrigger>
                          <SelectContent>
                            {limitOptions.map(option => (
                              <SelectItem key={option} value={option.toString()}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>

                    {/* Submit Button Component */}
                    <SubmitButton />
                </div>
              </form>
            </CardContent>
          </Card>

           {/* Ad Placeholder 1: Below Input Card */}
           <div
             id="ad-placeholder-top"
             className="w-full max-w-3xl h-auto mb-8 flex justify-center"
             aria-label="Advertisement Area 1"
           >
             <Image
                src="https://www.imglnkx.com/9659/DAT-460_DESIGN-23858_5_300100.gif"
                alt="Advertisement Banner Area 1"
                width={300}
                height={100}
                unoptimized
              />
           </div>


          <div className="w-full max-w-6xl">
            {/* Success message is now handled by the toast notification */}

            {/* Display error if present */}
            {state.error && (
               <Alert variant="destructive" className="mb-6 rounded-md">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error</AlertTitle>
                 {state.error.includes("credentials") ? (
                    <AlertDescription>
                        {state.error} See{' '}
                        <code className="font-mono text-xs bg-muted p-1 rounded">.env</code> file setup instructions.
                        You need to create a Reddit application{' '}
                        <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline hover:text-destructive-foreground">
                            here
                        </a> (choose 'script' type). Make sure both <code className="font-mono text-xs bg-muted p-1 rounded">REDDIT_CLIENT_ID</code> and <code className="font-mono text-xs bg-muted p-1 rounded">REDDIT_CLIENT_SECRET</code> are set correctly in the <code className="font-mono text-xs bg-muted p-1 rounded">.env</code> file.
                    </AlertDescription>
                 ) : state.error.includes("401") ? (
                     <AlertDescription>
                         {state.error}. Please double-check that your{' '}
                         <code className="font-mono text-xs bg-muted p-1 rounded">REDDIT_CLIENT_ID</code> and{' '}
                         <code className="font-mono text-xs bg-muted p-1 rounded">REDDIT_CLIENT_SECRET</code> in the{' '}
                         <code className="font-mono text-xs bg-muted p-1 rounded">.env</code> file are correct and match the credentials for your Reddit application{' '}
                         <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="underline hover:text-destructive-foreground">
                            here
                         </a>.
                     </AlertDescription>
                 ) : (
                    <AlertDescription>{state.error}</AlertDescription>
                 )}
               </Alert>
            )}

            {/* Show initial message */}
            {showInitialMessage && !state.images && !state.error && (
              <div className="text-center text-muted-foreground mt-10 p-6 border border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground/70" />
                <p>Enter a subreddit URL, select the number of images, and click "Get Images" to see results.</p>
              </div>
            )}

            {/* Show "No Images Found" alert */}
            {!showInitialMessage && state.images && state.images.length === 0 && !state.error && (
               <Alert className="mb-6 rounded-md border-accent">
                 <AlertCircle className="h-4 w-4 text-accent" />
                 <AlertTitle>No Suitable Images Found</AlertTitle>
                 <AlertDescription>The Reddit API returned posts, but none contained direct image links matching the criteria (e.g., not videos, galleries, or filtered by allowed domains).</AlertDescription>
               </Alert>
            )}

            {/* Display Image Grid */}
            {state.images && state.images.length > 0 && (
               <>
                 <ImageGrid key={state.timestamp} images={state.images} />
                 {/* Area 2 Ad Placeholder Removed */}
               </>
            )}
          </div>
        </div>

        {/* Side Ad Placeholder */}
        <aside className="hidden lg:flex lg:flex-col pt-20">
             <div
               id="ad-placeholder-side"
               className="relative w-full h-[600px] bg-muted/50 border border-dashed border-muted-foreground rounded-lg flex items-center justify-center text-muted-foreground sticky top-20 overflow-hidden"
               aria-label="Advertisement Area"
               style={{ maxHeight: 'calc(100vh - 10rem)' }} // Ensure it doesn't overflow viewport
             >
               <Image
                  src="https://www.imglnkx.com/7930/010678A_CXHR_18_ALL_EN_121_L.gif"
                  alt="Advertisement Banner"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority // Load this ad faster if visible
                  unoptimized // If the ad source handles optimization
                />
             </div>
        </aside>
      </div>
    </main>
    </>
  );
}

