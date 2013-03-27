AppScreenshotGenerator
======================

A client-side HTML5 app screenshot generator.

Overview
--------

### Templates

Templates specify x/y coordinates and width/height values to define the draw area for the screenshot.

`{ url: "templates/android/galaxy-nexus.png", x: 150, y: 226, w: 503, h: 823 }`

Templates can be added to the workspace area where screenshots can be combined. The same template can be used multiple times for any combination of template/screenshot pairing.

### Screenshots

Screenshots are created when one or more images are dragged onto the page. Once on the page, screenshots can be dragged onto an active template.

### Workspace

The workspace is the area where active templates and screenshots can be merged.

### Download

Items in the workspace can be downloaded in a zip archive to easily collect the work created in this app. This functionality is provided courtesy of [jszip](https://github.com/Stuk/jszip/tree).
