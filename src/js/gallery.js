/*
Project description:

The viewer:
The gallery viewer uses a stack of images to create a transition effect between images. 
    - The first image is loaded in all four containers:
        - The captioned background and transition containers using figure and figcaption elements and
        - The uncaptioned background and transition containers using .figure and .caption classes on div elements
    - The data-mode attribute is updated by JS from 'static' to 'active' to intialize the gallery and make it interactive. Also used as a CSS hook to determine visibility of the media controller and thumbnail container, both of which rely on JS to function.
    - The data-captioned attribute on the gallery element is used to determine whether to show the captioned or uncaptioned containers using css z-index and role attributes.
    - The transition data-view containers are set to opacity: 0 and the next image is loaded into them. Once a settimeout function has completed, the transition containers are set to opacity: 1. the opacity change is a CSS animation. Once the animation is complete. The src and srcset attributes of the background containers are updated to match the transition containers.
    - This pattern is repeated for each image in galleryObject.assets

Controls:
    - The gallery media controller is used to pause, play, advance or rewind the gallery. The gallery is paused when the user hovers over the gallery. The gallery is played when the user hovers off the gallery. The gallery is advanced when the user clicks the next button. The gallery is rewound when the user clicks the previous button. The gallery is paused when the user clicks the pause button. The gallery is played when the user clicks the play button.
    - The gallery is paused when the user clicks the next or previous button. The gallery is played when the user clicks the play button.
    - The gallery thumbnail buttons are used to load the corresponding image into the gallery. The gallery is paused when the user clicks a thumbnail. The gallery is played when the user clicks the play button. Playback resumes from the selected image's position in the gallery. Next and previous buttons will advance or rewind from the selected image's position in the gallery. The selected thumbnail is highlighted and updates to reflect the current image in the gallery. The scroll position of the thumbnail container is updated to keep the selected thumbnail in view.

Data source:
    The gallery is designed to be used with a CMS that renders a gallery object with the following schema:

    galleryObject.id // string
    galleryObject.assetIds // array of asset ids
    galleryObject.assets  // object of asset objects
    galleryObject.assets[assetId].type // string 'image' or 'video'
    galleryObject.assets[assetId].thumbnail // object of avif, webp, and jpg thumbnail url strings
    galleryObject.assets[assetId].inlineFormats // object of avif, webp, and jpg srcset strings
    galleryObject.assets[assetId].inlineSizes // sizes string
    galleryObject.assets[assetId].modalFormats // object of avif, webp, and jpg srcset strings
    galleryObject.assets[assetId].modalSizes // sizes string
    galleryObject.assets[assetId].caption // string
    galleryObject.assets[assetId].alt // alt text string
    galleryObject.assets[assetId].intrinsicWidth // width attribute string
    galleryObject.assets[assetId].intrinsicHeight // height attribute string

*/
// set up some environment variables
window.gallery = window.gallery || {};
window.gallery[galleryObject.id] = window.gallery[galleryObject.id] || {};
window.gallery[galleryObject.id].running = true;

// define dom elements for gallery
const gallery = document.querySelector(`.gallery-viewer[data-gallery-id="${galleryObject.id}"]`);

// playback controls
const galleryMediaConroller = gallery.querySelector(".media-controller");

// gallery thumbnail container
const galleryThumbnailContainer = gallery.querySelectorAll(".gallery-thumbnails");
const galleryThumbnailButtons = galleryThumbnailContainer.querySelectorAll("button");

// captioned version of image with background and transition containers
const galleryCaptionedImage = gallery.querySelector("figure");
const figureBackgroundAvif = galleryCaptionedImage.querySelector('picture[data-view="background"] source[type="image/avif"]');
const figureBackgroundWebp = galleryCaptionedImage.querySelector('picture[data-view="background"] source[type="image/webp"]');
const figureBackgroundJpg = galleryCaptionedImage.querySelector('picture[data-view="background"] img');
const figureTransitionAvif = galleryCaptionedImage.querySelector('picture[data-view="transition"] source[type="image/avif"]');
const figureTransitionWebp = galleryCaptionedImage.querySelector('picture[data-view="transition"] source[type="image/webp"]');
const figureTransitionJpg = galleryCaptionedImage.querySelector('picture[data-view="transition"] img');

const galleryBackgroundCaption = galleryCaptionedImage.querySelector('figcaption div[data-view="background"]');
const galleryTransitionCaption = galleryCaptionedImage.querySelector('figcaption div[data-view="transition"]');

// uncaptioned version of image with background and transition containers
const galleryNoCaptionImage = gallery.querySelector("> .figure");
const noCaptionBackgroundAvif = galleryNoCaptionImage.querySelector('picture[data-view="background"] source[type="image/avif"]');
const noCaptionBackgroundWebp = galleryNoCaptionImage.querySelector('picture[data-view="background"] source[type="image/webp"]');
const noCaptionBackgroundJpg = galleryNoCaptionImage.querySelector('picture[data-view="background"] img');
const noCaptionTransitionAvif = galleryNoCaptionImage.querySelector('picture[data-view="transition"] source[type="image/avif"]');
const noCaptionTransitionWebp = galleryNoCaptionImage.querySelector('picture[data-view="transition"] source[type="image/webp"]');
const noCaptionTransitionJpg = galleryNoCaptionImage.querySelector('picture[data-view="transition"] img');

const galleryNoCaptionBackgroundPlaceholder = gallery.querySelector('> .caption div[data-view="background"]');
const galleryNoCaptionTransitionPlaceholder = gallery.querySelector('> .caption div[data-view="transition"]');
// const galleryNoCaptionVideo = gallery.querySelector('> .video');
