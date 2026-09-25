// One place for links and release facts used across the page.
export const REPO = 'Aweswomedude1234/motion-cues';
export const REPO_URL = `https://github.com/${REPO}`;
export const VERSION = '1.1.0';
export const DOWNLOAD_URL = `${REPO_URL}/releases/latest/download/SteadyCues.exe`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

// Hero photograph: "Landscape photography of road" by Fritz Bielmeier, Unsplash License.
// Served from Unsplash's image CDN, which resizes it for each screen.
export const PHOTO_ID = 'photo-1447871622716-5dc761437456';
export const PHOTO_CREDIT = {name: 'Fritz Bielmeier', url: 'https://unsplash.com/@fritzbielmeier'};
export const PHOTO_PAGE = 'https://unsplash.com/photos/landscape-photography-of-road-RH-17EIWprY';
export function photo(width: number) {
  return `https://images.unsplash.com/${PHOTO_ID}?auto=format&fit=crop&w=${width}&q=78`;
}
