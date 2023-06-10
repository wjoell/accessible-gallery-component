/*
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
    galleryObject.assetIds // array of asset ids used as keys for galleryObject.assets
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
// set up the GalleryPlayer class
class GalleryPlayer {
    #galleryIDString;
    #galleryDataObject;
    constructor(galleryDataObject, galleryIDString, galleryViewer) {
        this.#galleryDataObject = galleryDataObject;
        this.#galleryIDString = galleryIDString;
        // set up some environment variables
        this.#galleryDataObject.running = false;
        this.#galleryDataObject.interval = false;
        this.#galleryDataObject.intervalDelay = 5 * 1000;
        this.#galleryDataObject.assetIndex = 0;
        // define dom elements for gallery
        this.gallery = galleryViewer;

        // test for gallery element and raise error if not found
        if (!this.gallery) {
            throw new Error(`Gallery element with data-gallery-id="${this.#galleryIDString}" not found.`);
        }
        // playback controls
        this.galleryMediaConroller = this.gallery.querySelector(".media-controller");
        this.galleryPlayPauseButton = this.galleryMediaConroller.querySelector(".media-play-pause");
        this.galleryNextButton = this.galleryMediaConroller.querySelector(".media-next");
        this.galleryPreviousButton = this.galleryMediaConroller.querySelector(".media-prev");

        // gallery thumbnail container
        this.galleryThumbnailContainer = this.gallery.querySelectorAll(".gallery-thumbnails");
        this.galleryThumbnailButtons = this.galleryThumbnailContainer.querySelectorAll("button");

        // captioned version of image with background and transition containers
        this.galleryCaptionedImage = this.gallery.querySelector("figure");
        this.figureBackgroundAvif = this.galleryCaptionedImage.querySelector('picture[data-view="background"] source[type="image/avif"]');
        this.figureBackgroundWebp = this.galleryCaptionedImage.querySelector('picture[data-view="background"] source[type="image/webp"]');
        this.figureBackgroundJpg = this.galleryCaptionedImage.querySelector('picture[data-view="background"] img');
        this.figureTransitionAvif = this.galleryCaptionedImage.querySelector('picture[data-view="transition"] source[type="image/avif"]');
        this.figureTransitionWebp = this.galleryCaptionedImage.querySelector('picture[data-view="transition"] source[type="image/webp"]');
        this.figureTransitionJpg = this.galleryCaptionedImage.querySelector('picture[data-view="transition"] img');
        this.galleryBackgroundCaption = this.galleryCaptionedImage.querySelector('figcaption div[data-view="background"]');
        this.galleryTransitionCaption = this.galleryCaptionedImage.querySelector('figcaption div[data-view="transition"]');

        // uncaptioned version of image with background and transition containers
        this.galleryNoCaptionImage = this.gallery.querySelector("> .figure");
        this.noCaptionBackgroundAvif = this.galleryNoCaptionImage.querySelector('picture[data-view="background"] source[type="image/avif"]');
        this.noCaptionBackgroundWebp = this.galleryNoCaptionImage.querySelector('picture[data-view="background"] source[type="image/webp"]');
        this.noCaptionBackgroundJpg = this.galleryNoCaptionImage.querySelector('picture[data-view="background"] img');
        this.noCaptionTransitionAvif = this.galleryNoCaptionImage.querySelector('picture[data-view="transition"] source[type="image/avif"]');
        this.noCaptionTransitionWebp = this.galleryNoCaptionImage.querySelector('picture[data-view="transition"] source[type="image/webp"]');
        this.noCaptionTransitionJpg = this.galleryNoCaptionImage.querySelector('picture[data-view="transition"] img');
        this.galleryNoCaptionBackgroundPlaceholder = this.gallery.querySelector('> .caption div[data-view="background"]');
        this.galleryNoCaptionTransitionPlaceholder = this.gallery.querySelector('> .caption div[data-view="transition"]');
        // this.galleryNoCaptionVideo = gallery.querySelector('> .video');
    }
    // instance methods
    /* Function to setinterval for gallery to loop through assetIds array
        - setinterval is cleared when user hovers over gallery
        - setinterval is cleared when user clicks next or previous button
        - setinterval is cleared when user clicks thumbnail button
        - setinterval is cleared when user clicks pause button
        - setinterval is set when user clicks play button
        - at each interval the next image is loaded into the transition containers
    */
    getDelay() {
        return this.#galleryDataObject.intervalDelay;
    }
    setDelay(delay) {
        this.#galleryDataObject.intervalDelay = delay;
    }

    /* Function to set the gallery to a specific image
        - the gallery is paused
        - the gallery is set to the specified image
        - the gallery is played
    */
    setImage(index) {
        // pause the gallery
        pause();
        // set the gallery to the specified image
        loadImage(index);
        // play the gallery
        play();
    }
    pause() {
        // pause the gallery
        window.gallery[galleryObject.id].running = false;
        // clear the gallery interval
        clearInterval(window.gallery[galleryObject.id].interval);
        // update the gallery media controller
        galleryMediaConroller.dataset.state = "paused";
    }
    play() {
        // play the gallery
        window.gallery[galleryObject.id].running = true;
        // set the gallery interval
        interval();
        // update the gallery media controller
        galleryMediaConroller.dataset.state = "playing";
    }
    loadImage(index) {
        // set the gallery to the specified image
        window.gallery[galleryObject.id].assetIndex = index;
        // set the gallery to the specified image
        setTransitionImageSrc(index);
        // set the gallery to the specified image
        setImageCaption(index);
        // set the gallery to the specified image
        setThumbnail(index);
    }
    setTransitionImageSrc(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set srcset and src for transition image
        this.figureTransitionAvif.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.avif;
        this.figureTransitionWebp.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.webp;
        this.figureTransitionJpg.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.jpg;
        this.figureTransitionJpg.src = this.#galleryDataObject.assets[assetId].src;
    }
    setBackgroundImageSrc(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set srcset and src for background image
        this.figureBackgroundAvif.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.avif;
        this.figureBackgroundWebp.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.webp;
        this.figureBackgroundJpg.srcset = this.#galleryDataObject.assets[assetId].inlineFormats.jpg;
        this.figureBackgroundJpg.src = this.#galleryDataObject.assets[assetId].src;
    }
    setTransitionImageCaption(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set transition caption
        this.galleryTransitionCaption.innerHTML = this.#galleryDataObject.assets[assetId].caption;
    }
    setBackgroundImageCaption(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set background caption
        this.galleryBackgroundCaption.innerHTML = this.#galleryDataObject.assets[assetId].caption;
    }
    setThumbnail(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set thumbnail
        this.galleryThumbnail.src = this.#galleryDataObject.assets[assetId].thumbnail;
    }
    startInterval() {
        if (this.#galleryDataObject.interval) {
            clearInterval(this.#galleryDataObject.interval);
        }
        this.#galleryDataObject.interval = setInterval(() => {
            // set the next image in the gallery or loop back to the first image
            this.#galleryDataObject.assetIndex = (this.#galleryDataObject.assetIndex + 1) % this.#galleryDataObject.assetIds.length;

            // set the next image in the gallery
            gallerySetImage(this.#galleryDataObject.assetIndex);
        }, this.#galleryDataObject.intervalDelay);
    }
    transition() {
        // animate the transition image
    }
    // initialize the gallery
    init() {
        // set .cpt-gallery-api instance to active
        this.gallery.closest(".cpt-gallery-api").dataset.mode = "active";
    }
}
for (let galleryIDString in window.galleryData) {
    window.galleryData[galleryIDString].player = new GalleryPlayer(
        window.galleryData[galleryIDString],
        galleryIDString,
        document.querySelector(`.gallery-viewer[data-gallery-id="${galleryIDString}"]`)
    );
    window.galleryData[galleryIDString].player.init();
}
