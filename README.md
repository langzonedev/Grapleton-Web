# Grapleton

[Open the Grapleton prototype](https://langzonedev.github.io/Grapleton-Web/)

Grapleton maps your wine collection to your physical rack. It starts with an empty rack so you can set it up for your own cellar.

1. Choose **Edit rack** to name and size the first rack. Use **Add rack** for other locations, then switch between them with the rack picker.
2. Tap a slot or **Add bottle**. Enter the wine’s name and vintage, choose its grape variety, and use **Take photo** or **Choose photo** to attach a label photo.
3. Tap an occupied slot for its photo and essential details. Open **Purchase, pairings & notes** for the rest, or choose **Look up wine** to search the web.
4. Enter a name, vintage, grape variety, style, rack name, or position under **Find a bottle**. For example, search **2010 Shiraz** and select the match to open its rack and highlight its slot.

## Storage and installation

Bottles and photos are saved in IndexedDB in the current browser profile. The app works offline after its first successful online load. Use the browser’s install option where offered, or use Safari’s Share menu and **Add to Home Screen** on iPhone.

Each rack can have up to 26 rows by 24 columns. It has no account, sync, or backup. Clearing site data removes your collection. The prototype uses a shared GitHub Pages origin. The camera and photo-picker options depend on the device and browser.

## Development

Serve the repository with any static HTTP server and open it on localhost. JavaScript modules and the service worker require HTTP or HTTPS. GitHub Actions publishes an explicit list of public app files to GitHub Pages on pushes to `main`. The deployed service worker uses a cache version derived from the release commit. Use **Check for updates** in the footer. If a release is already waiting, the button says **Update app**. Applying an update reloads Grapleton and keeps the saved cellar in IndexedDB. If you are upgrading from a version without this button, close all Grapleton tabs and reopen once.

The private architecture and commercial handoff are maintained in the separate Grapleton repository.

## Android candidate

The Capacitor Android shell packages the existing interface for offline use and connects the photo buttons to the native camera and photo picker. See [Android delivery](docs/ANDROID_DELIVERY.md) for build steps, the proposed application ID, signing, data boundaries and Play submission work. Browser and Android collections are stored separately. Native updates are delivered through Google Play.
