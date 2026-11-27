# Privacy

![Vraki](docs/media/VrakiHeader.png)

## The Vraki Language app (2017)

No personal information is used or stored by this app, other than any information handled by Microsoft to keep the app working and for crash analysis. The text you convert stays on your device.

## The website

The website at https://deovandski.github.io/vraki-windows/ has no cookies, no analytics and no ads. The converter and the typeface preview run entirely in your browser; nothing you type is sent anywhere. The site is hosted on GitHub Pages, so [GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) sees your IP address when it sends you the page.

The Settings menu (the gear, top right) saves your Language and Text size choices in your browser's local storage, under the key `vraki-site`, so they are remembered next time. They never leave your device; clearing the site's data removes them.

**Offline copies.** So the website opens without a connection, and as an app if you install it, a service worker (`site/sw.js`) keeps copies of the pages you open, with their scripts and the Vraki font, in your browser's Cache Storage. Images, video and anything from other websites are never saved. The copies stay on your device and are never sent anywhere; clearing the site's data removes them. The Install app button in Settings saves nothing.

**Stats for nerds.** The debug page (Settings › DEBUG, `/debug/`) shows what your browser tells the page about itself: browser and device, screen, storage use, connection, page timings. It reads this only to show it to you on that page. Nothing is saved and nothing is sent anywhere; the page only asks this website for its build file (`stats.json`) and times three small requests to it.

The website is also offered in other languages. Those versions were translated ahead of time by AI (Claude) from the English original and say so in a banner at the top.

Questions: open an [issue](https://github.com/Deovandski/vraki-windows/issues).

Copyright (c) 2017, Deovandski Skibinski Junior.
