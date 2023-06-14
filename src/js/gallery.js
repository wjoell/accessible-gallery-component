/*
The viewer:
The gallery viewer uses a stack of two images to create a transition for the incoming image. 
    - The first image is loaded in both layers:
        - The background and transition containers using .figure and .caption classes on div elements
    - The data-mode attribute is updated by JS from 'static' to 'active' to intialize the gallery and make it interactive. Also used as a CSS hook to determine visibility of the media controller and thumbnail container, both of which rely on JS to function.
    - The data-captioned attribute on the gallery element is used to determine whether to add a role of "figure" and aria-labelledby attribute to the gallery element. This is used to make the gallery accessible to screen readers when a caption is present.
    - The transition data-view container is set to opacity: 0 and the next image is loaded into it. Once a settimeout function has completed, the transition container is set to opacity: 1. Once the animation is complete. The src and srcset attributes of the background container are updated to match the transition container.
    - The background container has a role of "none" to prevent it from being read by screen readers.
    - This pattern is repeated for each image in galleryObject.assets

Controls:
    - The gallery media controller is used to pause, play, advance or rewind the gallery one position. The gallery is paused when the user hovers over the gallery and resumes when the user hovers off the gallery. The gallery is advanced when the user clicks the next button. The gallery is rewound when the user clicks the previous button. The gallery is paused when the user clicks the pause button. The gallery is played when the user clicks the play button.
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
        this.#galleryDataObject.intervalDelay = 10 * 1000;
        this.#galleryDataObject.assetIndex = 0;
        // define dom elements for gallery
        this.gallery = galleryViewer;

        // test for gallery element and raise error if not found
        if (!this.gallery) {
            throw new Error(`Gallery element with data-gallery-id="${this.#galleryIDString}" not found.`);
        }
        // playback controls
        this.galleryMediaController = this.gallery.querySelector(".media-controller");
        this.galleryPlayPauseButton = this.galleryMediaController.querySelector(".media-play-pause");
        this.galleryNextButton = this.galleryMediaController.querySelector(".media-next");
        this.galleryPreviousButton = this.galleryMediaController.querySelector(".media-prev");

        // gallery thumbnail container
        this.galleryThumbnailContainer = this.gallery.closest(".cpt-gallery-api").querySelector(".gallery-thumbnails");
        this.galleryThumbnailButtons = this.galleryThumbnailContainer.querySelectorAll("button");

        // captioned version of image with background and transition containers
        this.galleryImage = this.gallery.querySelector(".figure");
        this.figureBackgroundAvif = this.galleryImage.querySelector('picture[data-view="background"] source[type="image/avif"]');
        this.figureBackgroundWebp = this.galleryImage.querySelector('picture[data-view="background"] source[type="image/webp"]');
        this.figureBackgroundJpg = this.galleryImage.querySelector('picture[data-view="background"] img');
        this.figureTransitionAvif = this.galleryImage.querySelector('picture[data-view="transition"] source[type="image/avif"]');
        this.figureTransitionWebp = this.galleryImage.querySelector('picture[data-view="transition"] source[type="image/webp"]');
        this.figureTransitionJpg = this.galleryImage.querySelector('picture[data-view="transition"] img');
        this.galleryBackgroundCaption = this.galleryImage.querySelector('.caption div[data-view="background"]');
        this.galleryTransitionCaption = this.galleryImage.querySelector('.caption div[data-view="transition"]');

        // progress bar
        this.galleryProgressBar = this.gallery.querySelector(".progress-bar");
        this.galleryImage.addEventListener("mouseenter", () => {
            this.pause();
        });
        this.galleryImage.addEventListener("mouseleave", () => {
            this.play();
        });
        this.gallery.closest(".cpt-gallery-api").addEventListener("click", (event) => {
            if (event.target.closest(".media-play-pause")) {
                this.togglePlayPause();
            }
            if (event.target.closest(".media-next")) {
                this.next();
            }
            if (event.target.closest(".media-prev")) {
                this.previous();
            }
            // console.log(event.target);
            if (event.target.closest("button.thumbnail")) {
                console.log(event.target.closest("button.thumbnail").dataset.assetId);
                clearInterval(this.#galleryDataObject.interval);
                this.#galleryDataObject.assetIndex = this.#galleryDataObject.assetIds.indexOf(event.target.closest("button.thumbnail").dataset.assetId);
                this.loadImage(this.#galleryDataObject.assetIndex);
                this.transition();
                this.startInterval();
            }
        });
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
        this.#galleryDataObject.running = false;
        // console.log(this.#galleryDataObject.running);
        // clear the gallery interval
        clearInterval(this.#galleryDataObject.interval);
        // update the gallery media controller
        // console.log(this.galleryMediaController);
        this.galleryMediaController.dataset.state = "paused";
    }
    next() {
        // clear the gallery interval
        clearInterval(this.#galleryDataObject.interval);
        // set the gallery to the next image
        this.#galleryDataObject.assetIndex++;
        if (this.#galleryDataObject.assetIndex >= this.#galleryDataObject.assetIds.length) {
            this.#galleryDataObject.assetIndex = 0;
        }
        this.loadImage(this.#galleryDataObject.assetIndex);
        this.transition();
        this.startInterval();
    }
    previous() {
        // clear the gallery interval
        clearInterval(this.#galleryDataObject.interval);
        // set the gallery to the previous image
        this.#galleryDataObject.assetIndex--;
        if (this.#galleryDataObject.assetIndex < 0) {
            this.#galleryDataObject.assetIndex = this.#galleryDataObject.assetIds.length - 1;
        }
        this.loadImage(this.#galleryDataObject.assetIndex);
        this.transition();
        this.startInterval();
    }
    play() {
        // play the gallery
        this.#galleryDataObject.running = true;
        // console.log(this.#galleryDataObject.running);
        // set the gallery interval
        clearInterval(this.#galleryDataObject.interval);
        this.startInterval();
        // update the gallery media controller
        // console.log(this.galleryMediaController);
        this.galleryMediaController.dataset.state = "playing";
    }
    togglePlayPause() {
        // toggle the gallery play/pause
        if (this.#galleryDataObject.running) {
            this.pause();
        } else {
            this.play();
        }
    }
    loadImage(index) {
        // set the gallery to the specified image
        this.#galleryDataObject.assetIndex = index;
        // set the gallery to the specified image
        this.setTransitionImageSrc(index);
        // set the gallery to the specified image
        this.setTransitionImageCaption(index);
        // set the gallery to the specified image
        this.setActiveThumbnail(index);
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
        // set transition caption if not null
        this.galleryTransitionCaption.innerHTML = this.#galleryDataObject.assets[assetId].caption ?? "";
    }
    setBackgroundImageCaption(index) {
        // set key for assetId
        let assetId = this.#galleryDataObject.assetIds[index];
        // set background caption if not null
        this.galleryBackgroundCaption.innerHTML = this.#galleryDataObject.assets[assetId].caption ?? "";
    }
    setActiveThumbnail(index) {
        // set key for assetId
        for (let item of this.galleryThumbnailContainer.querySelectorAll("button[aria-pressed='true']")) {
            item.removeAttribute("aria-pressed");
        }
        let assetId = this.#galleryDataObject.assetIds[index];
        // set thumbnail
        this.galleryThumbnailContainer.querySelector(`button[data-asset-id="${assetId}"]`).setAttribute("aria-pressed", "true");
    }
    startInterval() {
        if (this.#galleryDataObject.interval) {
            clearInterval(this.#galleryDataObject.interval);
        }
        this.#galleryDataObject.interval = setInterval(() => {
            // trans// set the next image in the gallery or loop back to the first image
            this.#galleryDataObject.assetIndex = (this.#galleryDataObject.assetIndex + 1) % this.#galleryDataObject.assetIds.length;

            // set the next image in the gallery

            this.figureTransitionJpg.style.opacity = 0;
            this.setTransitionImageSrc(this.#galleryDataObject.assetIndex);
            this.transition();
            this.resetProgressBar(this.#galleryDataObject.intervalDelay);
        }, this.#galleryDataObject.intervalDelay);
    }
    transition() {
        // animate the transition image
        this.figureTransitionJpg.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 1000,
            easing: "ease-in-out",
            fill: "forwards",
        });
        this.setActiveThumbnail(this.#galleryDataObject.assetIndex);
        Promise.all(this.figureTransitionJpg.getAnimations().map((animation) => animation.finished)).then(() => {
            // console.log("finished 1");
            // set the background image to the transition image
            this.setBackgroundImageSrc(this.#galleryDataObject.assetIndex);
            // set the caption to the transition caption
            this.setBackgroundImageCaption(this.#galleryDataObject.assetIndex);
            // set the thumbnail to the transition thumbnail
            // set the transition image to the next image in the gallery
        });
    }
    resetProgressBar(duration) {
        let durationSeconds = duration / 1000;
        // reset the progress bar
        let progressValue = 0;
        let progressInterval = setInterval(() => {
            progressValue += 0.05;
            if ((progressValue / durationSeconds) * 100 >= 100) {
                clearInterval(progressInterval);
            }
            this.galleryProgressBar.querySelector("progress").value = (progressValue / durationSeconds) * 100;
            this.galleryProgressBar.querySelector(`#progress-alert-${this.#galleryDataObject.galleryId}`).innerHTML = `${Math.round(
                (progressValue / durationSeconds) * 100
            )}%`;
        }, 100);
    }
    // initialize the gallery
    init() {
        // set .cpt-gallery-api instance to active
        this.gallery.closest(".cpt-gallery-api").dataset.mode = "active";
        // set the opacity of the transition image to 0
        this.figureTransitionJpg.style.opacity = 0;
        // initialize the interval
        this.startInterval();
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
