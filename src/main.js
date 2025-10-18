/***************************************************
 
    Wishlist for Fab
    by Crezetique
    https://github.com/Crezetique/WishlistForFab
    
    Fixed version with improved initialization and icon display

****************************************************/

// Prevent multiple initializations
if (typeof window.wishlistForFabInitialized === 'undefined') {
    window.wishlistForFabInitialized = true;

    let wishlistForFab = new function() {
        //#region Extension Settings
        const extensionVersion = '1.1.0';
        const localStorageName_Wishlist = 'wishlistCustom';
        const react_root = document.getElementById('__SKFB_REACT_ROOT') || document.body;

        // Selectors
        const selector_NavActionMenu = '.fabkit-MegaMenu-actions';
        const selector_Sidebar = 'aside.uOXrHl_o .ny_JIXbd';
        const selector_StoreListing = '.fabkit-Thumbnail--16\\/9';
        //#endregion

        //#region Data Handling
        this.dataWishlist = [];
        this.idStoreListing = null;
        let cacheLocation = null;

        let el_NavActionMenu = null;
        let el_Sidebar = null;
        let el_WishlistButton = null;
        let el_WishlistNav = null;
        let el_WishlistTab = null;
        let el_WishlistTab_Filters = null;
        let el_WishlistTab_Content = null;
        let el_WishlistTab_Export = null;
        let el_WishlistButton_Export = null;

        let filtersWishlistAvailable = [];
        let filtersWishlistReserve = ['on-sale', '2d-asset', '3d-model', 'animation', 'atlas', 'audio', 'brush', 'decal', 'education-tutorial', 'environment', 'game-systems', 'game-template', 'hdri', 'material', 'smart-asset', 'tool-&-plugin', 'ui', 'vfx'];

        this.isStoreListingPage = function() {
            return window.location.pathname.split('/')[1] === 'listings';
        }

        this.isInWishlist = function(id) {
            return wishlistForFab.dataWishlist.find((element) => element === id) !== undefined;
        }

        function getPageListingID() {
            return window.location.pathname.split('/')[2];
        }

        async function getLiveListingData(id) {
            const url = `https://www.fab.com/i/listings/${id}`;
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                const data = await response.json();
                return {
                    id: data.uid,
                    name: data.title,
                    seller: data.user.sellerName,
                    thumbnail: data.thumbnails[0].images[2].url,
                    category: data.listingType,
                    tags: data.tags,
                    price: data.startingPrice.price,
                    discountedPrice: data.startingPrice.discountedPrice
                };
            } catch (error) {
                console.error(error.message);
            }
        }

        function formatCategory(category) {
            return category
                .replace(/-/g, ' ')
                .replace(/and/g, '&')
                .replace(/(?:^|\s)\w/g, (letter) => letter.toUpperCase())
                .replace(/(2d|3d|Ui|Vfx|Hdri)/, ($1) => $1.toUpperCase());
        }
        //#endregion

        //#region DOM Templates
        const html_WishlistButton = `
            <div class="fabkit-Surface-root fabkit-Surface--emphasis-background-elevated-low-transparent fabkit-scale--gutterX-spacing-8 fabkit-scale--gutterY-spacing-8 fabkit-Stack-root fabkit-scale--gapX-spacing-4 fabkit-scale--gapY-spacing-4 fabkit-Stack--column ny_JIXbd">
                <h2 class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Heading--sm">Wishlist</h2>
                <button id="button_wishlist" class="fabkit-Button--secondary fabkit-Button-root fabkit-Button--md fabkit-Button--fullWidth" type="button">
                    <span class="fabkit-Button-label add">Add to Wishlist</span>
                    <span class="fabkit-Button-label remove">In Wishlist</span>
                </button>
            </div>
        `;
        
        const html_WishlistNav = `
            <li>
                <span class="fabkit-StickyElement-root fabkit-StickyElement--top-right fabkit-StickyElement--show">
                    <button id="megamenu_wishlistToggle" class="fabkit-Button-root fabkit-Button--icon fabkit-Button--sm fabkit-Button--ghost fabkit-MegaMenu-iconButton" type="button">
                        <span class="fabkit-Button-label wishlist-heart-icon"></span>
                    </button>
                </span>
            </li>
        `;
        
        const html_WishlistTab = `
            <div id="tab_wishlist" wishlist-count="0">
                <div class="fabkit-Stack-root fabkit-scale--gapX-layout-10 fabkit-scale--gapY-layout-10 fabkit-Stack--column fabkit-Container-root fabkit-Container--center EqJe4XaR">
                    <div class="fabkit-Stack-root fabkit-Stack--justify_space-between fabkit-scale--gapX-spacing-4 fabkit-scale--gapY-spacing-4">
                        <div>
                            <h2 class="fabkit-Typography-root fabkit-typography--align-start nkhb3MLS">
                                <span class="fabkit-Heading--2xl fabkit-typography--intent-primary">Wishlist For Fab</span>
                                <span class="fabkit-typography--intent-secondary title-sub">by <a href="https://crezetique.com/" target="_blank" class="fabkit-Link--underlined">Crezetique</a></span>
                            </h2>
                            <span class="fabkit-typography--intent-primary">Version ${extensionVersion}</span>
                        </div>
                        <ul class="fabkit-Stack-root fabkit-Stack--align_center fabkit-scale--gapX-layout-3 fabkit-scale--gapY-layout-3 fabkit-Stack--wrap">
                            <button id="tab_wishlist_export" class="fabkit-Button-root fabkit-Button--md fabkit-Button--secondary" type="button" aria-label="Export Wishlist" aria-toggle="false">
                                <span class="fabkit-Button-label">Export</span>
                            </button>
                            <button id="tab_wishlist_close" class="fabkit-Button-root fabkit-Button--icon fabkit-Button--md fabkit-Button--secondary" type="button" aria-label="Close Wishlist">
                                <span class="fabkit-Button-label">✕</span>
                            </button>
                        </ul>
                    </div>
                    <textarea id="wishlist_export" aria-hidden="true" class="fabkit-InputContainer-root fabkit-InputContainer--md fabkit-InputContainer--fullWidth" readonly></textarea>
                    <div class="wishlist-message-empty fabkit-Heading--lg">Your wishlist is empty.</div>
                    <ul id="tab_wishlist_filters" class="fabkit-Stack-root fabkit-Stack--align_center fabkit-scale--gapX-layout-3 fabkit-scale--gapY-layout-3 fabkit-Stack--wrap"></ul>
                    <div class="wishlist-message-filter-zero fabkit-Heading--lg">No results with selected filter(s).</div>
                    <div class="oHi6n5rt fabkit-Grid-root">
                        <div class="GHXOxKbm">
                            <ul id="tab_wishlist_content" class="fabkit-ResultGrid-root fabkit-ResultGrid-col--sm fabkit-Grid-root fabkit-scale--gapX-layout-6 fabkit-scale--gapY-layout-6"></ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const html_ListingWishlistButton = `
            <div class="wishlist-card-button">
                <span class="wishlist-heart-toggle"></span>
            </div>
        `;

        function formatSingleWishlistPlaceholder(id) {
            return `
                <li class="wishlist-listing wishlist-placeholder" wishlist-id="${id}">
                    <div class="fabkit-Stack-root fabkit-scale--gapX-layout-3 fabkit-scale--gapY-layout-3 fabkit-Stack--column hTu1xoWw">
                        <div class="fabkit-Thumbnail-root fabkit-Thumbnail--16/9 fabkit-scale--radius-3 Vq2qCiz2">
                            <a class="fabkit-Thumbnail-root fabkit-Stack--fullWidth fabkit-Stack--fullHeight" href="/listings/${id}">
                                <div class="fabkit-Surface-root fabkit-Skeleton-root fabkit-Thumbnail-placeholder --emphasis0"></div>
                            </a>
                        </div>
                    </div>
                    <div class="fabkit-Stack-root fabkit-scale--gapX-spacing-1 fabkit-scale--gapY-spacing-1 fabkit-Stack--column">
                        <div class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Heading--md fabkit-Surface-root fabkit-scale--radius-1 fabkit-Skeleton-root --emphasisbackground-elevated-high-default" style="width: 70%;">name</div>
                        <div class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Text--md fabkit-Text--regular fabkit-Surface-root fabkit-scale--radius-1 fabkit-Skeleton-root --emphasisbackground-elevated-high-default" style="width: 30%;">type</div>
                    </div>
                </li>
            `;
        }

        function formatSingleWishlistListing(data) {
            return `
                <li class="wishlist-listing ${data.discountedPrice !== null ? 'wishlist-onsale' : ''}" listing-category="${data.category.replace(/ /g, '-')}" wishlist-id="${data.id}" wishlist-state="${wishlistForFab.isInWishlist(data.id)}">
                    <div class="fabkit-Stack-root fabkit-scale--gapX-layout-3 fabkit-scale--gapY-layout-3 fabkit-Stack--column hTu1xoWw">
                        <div class="fabkit-Thumbnail-root fabkit-Thumbnail--16/9 fabkit-scale--radius-3 Vq2qCiz2">
                            <a class="fabkit-Thumbnail-root fabkit-Stack--fullWidth fabkit-Stack--fullHeight" href="/listings/${data.id}">
                                <img src="${data.thumbnail}">
                            </a>
                            <div class="wishlist-card-button in-wishlist-page" data-id="${data.id}">
                                <span class="wishlist-heart-toggle"></span>
                            </div>
                        </div>
                    </div>
                    <div class="fabkit-Stack-root fabkit-Stack--align_start fabkit-scale--gapX-spacing-1 fabkit-scale--gapY-spacing-1 fabkit-Stack--fullWidth fabkit-Stack--column">
                        <div class="fabkit-Stack-root fabkit-Stack--fullWidth fabkit-Stack--column">
                            <div class="fabkit-Stack-root fabkit-Stack--align_center fabkit-Stack--justify_space-between fabkit-scale--gapX-spacing-5 fabkit-scale--gapY-spacing-5 fabkit-Stack--fullWidth JCBmZ1xu">
                                <a class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Typography--ellipsis fabkit-Heading--sm qDOIxHMs fabkit-Focusable-root" href="/listings/${data.id}">
                                    <div class="fabkit-Typography-ellipsisWrapper">${data.name}</div>
                                </a>
                            </div>
                            <div class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-secondary fabkit-Text--md fabkit-Text--regular wishlist-capitalize">
                                ${formatCategory(data.category)}
                            </div>
                            <div class="fabkit-Stack-root fabkit-scale--gapX-spacing-2 fabkit-scale--gapY-spacing-2">
                                ${data.price === 0 ? 
                                    `<div class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Text--lg fabkit-Text--regular">Free</div>` : 
                                    `<div class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-secondary fabkit-Text--md fabkit-Text--regular">From 
                                        ${data.discountedPrice !== null ? 
                                            `<span class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Text--lg fabkit-Text--regular">$${data.discountedPrice}</span>
                                            <span class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-secondary fabkit-Text--lg fabkit-Text--regular wishlist-strikeout">$${data.price}</span>` :
                                            `<span class="fabkit-Typography-root fabkit-typography--align-start fabkit-typography--intent-primary fabkit-Text--lg fabkit-Text--regular">$${data.price}</span>`
                                        }
                                    </div>`
                                }
                            </div>
                        </div>
                    </div>
                </li>
            `;
        }

        function formatSingleWishlistFilter(category) {
            return `
                <li>
                    <div class="wishlist-filter-button fabkit-Tag-root fabkit-Tag--md fabkit-Tag--rounded fabkit-Tag--interactive" aria-toggle="false" category-filter="${category}">
                        <span class="fabkit-Tag-label">${formatCategory(category)}</span>
                    </div>
                </li>
                ${category === 'on-sale' ? `<li>|</li>` : ``}
            `;
        }
        //#endregion

        //#region DOM Manipulation
        function constructWishlistNav() {
            el_NavActionMenu = document.querySelector(selector_NavActionMenu);
            if (!el_NavActionMenu) return;
            
            el_NavActionMenu.insertAdjacentHTML('afterbegin', html_WishlistNav);
            el_WishlistNav = document.querySelector('#megamenu_wishlistToggle');
            if (el_WishlistNav) {
                el_WishlistNav.addEventListener('click', () => toggleWishlistTab());
            }
        }

        function constructWishlistTab() {
            if (el_WishlistTab !== null) return;
            
            const mainElement = document.querySelector('main');
            if (!mainElement) return;
            
            mainElement.insertAdjacentHTML('afterbegin', html_WishlistTab);
            el_WishlistTab = document.querySelector('#tab_wishlist');
            el_WishlistTab_Filters = document.querySelector('#tab_wishlist_filters');
            el_WishlistTab_Content = document.querySelector('#tab_wishlist_content');
            el_WishlistTab_Export = document.querySelector('#wishlist_export');
            
            el_WishlistButton_Export = el_WishlistTab.querySelector('#tab_wishlist_export');
            el_WishlistButton_Export.addEventListener('click', () => toggleWishlistExport());
            
            let el_WishlistButton_Close = el_WishlistTab.querySelector('#tab_wishlist_close');
            el_WishlistButton_Close.addEventListener('click', () => toggleWishlistTab());
            
            populateWishlistExport();
        }

        function constructWishlistSidebar() {
            if (el_Sidebar === null) return;

            if (el_Sidebar.getAttribute('wishlist-initialized') !== 'true') {
                el_Sidebar.setAttribute('wishlist-initialized', 'true');
                el_Sidebar.insertAdjacentHTML('afterend', html_WishlistButton);
                el_WishlistButton = document.querySelector('#button_wishlist');
                el_WishlistButton.addEventListener('click', () => toggleOnWishlist(wishlistForFab.idStoreListing));
            } else {
                el_WishlistButton = document.querySelector('#button_wishlist');
            }

            if (el_WishlistButton) {
                el_WishlistButton.setAttribute('wishlist-id', wishlistForFab.idStoreListing);
                el_WishlistButton.setAttribute('wishlist-state', wishlistForFab.isInWishlist(wishlistForFab.idStoreListing));
            }
        }

        function manipulateStoreListing(element) {
            if (!element || element.getAttribute('wishlist-initialized') === 'true') return;

            element.setAttribute('wishlist-initialized', 'true');

            // Find the link to get the ID
            let link = null;
            let container = element.closest('li') || element.parentElement;
            
            if (container) {
                link = container.querySelector('a[href*="/listings/"]');
            }

            if (link && link.href) {
                let id = link.href.split('/listings/')[1];
                if (id) {
                    id = id.split('/')[0].split('?')[0];
                    
                    element.setAttribute('wishlist-id', id);
                    element.setAttribute('wishlist-state', wishlistForFab.isInWishlist(id));
                    
                    // Add the wishlist button
                    element.insertAdjacentHTML('beforeend', html_ListingWishlistButton);
                    let button = element.querySelector('.wishlist-card-button');
                    if (button) {
                        button.setAttribute('data-id', id);
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleOnWishlist(id);
                        });
                    }
                }
            }
        }

        function populateAllWishlistListing(shouldRepopulate) {
            if (!el_WishlistTab) return;
            
            let IsPopulated = el_WishlistTab.getAttribute('wishlist-populated') === 'true';
            
            if (shouldRepopulate && IsPopulated) { 
                el_WishlistTab_Content.innerHTML = '';
            } else if (IsPopulated && !shouldRepopulate) {
                return;
            }
            
            el_WishlistTab.removeAttribute('wishlist-filter');
            el_WishlistTab.setAttribute('wishlist-populated', 'true');
            el_WishlistTab.setAttribute('wishlist-count', wishlistForFab.dataWishlist.length);
            filtersWishlistAvailable = [];
        
            wishlistForFab.dataWishlist.forEach(id => addWishlistListing(id));
        }

        async function addWishlistListing(id) {
            if (!el_WishlistTab_Content) return;
            
            el_WishlistTab_Content.insertAdjacentHTML('beforeend', formatSingleWishlistPlaceholder(id));
            let placeholder = document.querySelector(`.wishlist-placeholder[wishlist-id="${id}"]`);

            await getLiveListingData(id).then(data => {
                if (!data) return;
                
                placeholder.insertAdjacentHTML('afterend', formatSingleWishlistListing(data));
                placeholder.remove();

                let listing = document.querySelector(`.wishlist-listing[wishlist-id="${data.id}"]`);
                let button = listing.querySelector('.wishlist-card-button');
                if (button) {
                    button.addEventListener('click', () => removeFromWishlist(data.id));
                }

                let isListingOnsale = data.discountedPrice !== null;
                let categoryFormatted = data.category.replace(/ /g, '-');
                
                if (filtersWishlistAvailable.indexOf(categoryFormatted) === -1 || (isListingOnsale && filtersWishlistAvailable.indexOf('on-sale') === -1)) {
                    if (isListingOnsale) {
                        filtersWishlistAvailable.push('on-sale');
                    }
                    filtersWishlistAvailable.push(categoryFormatted);
                    populateWishlistFilters();
                }
            });
        }

        function populateWishlistFilters() {
            if (!el_WishlistTab_Filters) return;
            
            let IsPopulated = el_WishlistTab_Filters.getAttribute('filters-populated') === 'true';
            
            if (!IsPopulated) {
                filtersWishlistReserve.forEach(filter => {
                    el_WishlistTab_Filters.insertAdjacentHTML('beforeend', formatSingleWishlistFilter(filter));
                });
                
                document.querySelectorAll('.wishlist-filter-button').forEach(element => {
                    element.addEventListener('click', () => toggleWishlistFilter(element.getAttribute('category-filter')));
                });
                
                el_WishlistTab_Filters.setAttribute('filters-populated', true);
            }
            
            filtersWishlistReserve.forEach(category => {
                let element = document.querySelector(`.wishlist-filter-button[category-filter="${category}"]`);
                if (!element) return;
                
                if (filtersWishlistAvailable.includes(category) || category === 'on-sale') {
                    element.parentElement.style.display = 'block';
                } else {
                    element.parentElement.style.display = 'none';
                }
            });
    
            clearWishlistFilter();
        }

        function populateWishlistExport() {
            if (el_WishlistTab_Export) {
                el_WishlistTab_Export.value = JSON.stringify(wishlistForFab.dataWishlist, null, 4);
            }
        }
        //#endregion

        //#region Wishlist Functionality
        function addToWishlist(id) {
            wishlistForFab.dataWishlist.push(id);
            setDataToStorage();

            document.querySelectorAll(`[wishlist-id="${id}"]`).forEach(element => {
                element.setAttribute('wishlist-state', 'true');
            });
            
            document.querySelectorAll(`.wishlist-card-button[data-id="${id}"]`).forEach(button => {
                button.parentElement.setAttribute('wishlist-state', 'true');
            });

            if (el_WishlistTab !== null) {
                if (el_WishlistTab.getAttribute('wishlist-populated') === 'true') {
                    addWishlistListing(id);
                }
                
                el_WishlistTab.setAttribute('wishlist-count', wishlistForFab.dataWishlist.length);
                populateWishlistFilters();
            }
        }

        function removeFromWishlist(id) {
            wishlistForFab.dataWishlist = wishlistForFab.dataWishlist.filter((element) => element !== id);
            setDataToStorage();

            document.querySelectorAll(`[wishlist-id="${id}"]`).forEach(element => {
                element.setAttribute('wishlist-state', 'false');
            });
            
            document.querySelectorAll(`.wishlist-card-button[data-id="${id}"]`).forEach(button => {
                button.parentElement.setAttribute('wishlist-state', 'false');
            });
            
            if (el_WishlistTab !== null) {
                let listing = document.querySelector(`.wishlist-listing[wishlist-id="${id}"]`);
                if (listing) {
                    let category = listing.getAttribute('listing-category');
                    listing.remove();
                    
                    if (el_WishlistTab.querySelectorAll(`.wishlist-listing[listing-category="${category}"]`).length === 0) {
                        filtersWishlistAvailable = filtersWishlistAvailable.filter((element) => element !== category);
                    }
                    if (el_WishlistTab.querySelectorAll(`.wishlist-listing.wishlist-onsale`).length === 0) {
                        filtersWishlistAvailable = filtersWishlistAvailable.filter((element) => element !== 'on-sale');
                    }
                }
                
                el_WishlistTab.setAttribute('wishlist-count', wishlistForFab.dataWishlist.length);
                populateWishlistFilters();
            }
        }

        function toggleOnWishlist(id) {
            if (!id) return;
            
            let stateChange = !wishlistForFab.isInWishlist(id);

            if (stateChange) { 
                addToWishlist(id);
            } else {
                removeFromWishlist(id);
            }
        }
        
        // Make it globally accessible
        this.toggleOnWishlist = toggleOnWishlist;

        function toggleWishlistTab(state) {
            let stateCache = state;
            if (typeof state !== 'boolean') {
                stateCache = !(document.body.getAttribute('wishlist-tab-state') === 'open');
            }

            document.body.setAttribute('wishlist-tab-state', stateCache ? 'open' : 'close');

            if (stateCache) {
                populateAllWishlistListing();
            }
        }

        function toggleWishlistExport() {
            if (!el_WishlistButton_Export || !el_WishlistTab_Export) return;
            
            let state = !(el_WishlistButton_Export.getAttribute('aria-toggle') === 'true');
            el_WishlistTab_Export.setAttribute('aria-hidden', !state);
            el_WishlistButton_Export.setAttribute('aria-toggle', state);
        }

        function clearWishlistFilter() {
            if (!el_WishlistTab) return;
            
            el_WishlistTab.removeAttribute('wishlist-filter');
            
            let previousFilter = document.querySelector(`.wishlist-filter-button[aria-toggle="true"]`);
            if (previousFilter) {
                previousFilter.setAttribute('aria-toggle', 'false');
            }
        }

        function toggleWishlistFilter(category) {
            if (!category || !el_WishlistTab) return;
            
            let previousFilter = document.querySelector(`.wishlist-filter-button[aria-toggle="true"]:not([category-filter="on-sale"])`);
            let nextFilter = document.querySelector(`.wishlist-filter-button[category-filter="${category}"]`);
            if (!nextFilter) return;
            
            let previousFilterState = nextFilter.getAttribute('aria-toggle') === 'true';
            
            if (previousFilter && category !== 'on-sale') {
                previousFilter.setAttribute('aria-toggle', 'false');
            }

            if (category === 'on-sale') {
                el_WishlistTab.setAttribute('wishlist-filter-onsale', !previousFilterState);
            } else if (!previousFilterState) {
                el_WishlistTab.setAttribute('wishlist-filter', category);
            } else {
                el_WishlistTab.setAttribute('wishlist-filter', 'false');
            }
            
            let visibleListingSelector = `.wishlist-listing${
                (el_WishlistTab.getAttribute('wishlist-filter-onsale') === "true" ? '.wishlist-onsale' : '') +
                (!previousFilterState && category !== 'on-sale' ? `[listing-category="${category}"]` : '')
            }`;
            el_WishlistTab.setAttribute('wishlist-filter-result', document.querySelectorAll(visibleListingSelector).length);
            nextFilter.setAttribute('aria-toggle', !previousFilterState);
        }

        function UpdatePageListingData() {
            if (wishlistForFab.isStoreListingPage()) {
                el_Sidebar = document.querySelector(selector_Sidebar);
                wishlistForFab.idStoreListing = getPageListingID();
                
                constructWishlistSidebar();
            } else {
                wishlistForFab.idStoreListing = null;
                el_Sidebar = null;
            }
        }
        //#endregion

        //#region Data Storage
        function arraysEqual(a, b) {
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (a.length !== b.length) return false;
            
            for (var i = 0; i < a.length; ++i) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        function setDataToStorage() {
            localStorage.setItem(localStorageName_Wishlist, JSON.stringify(wishlistForFab.dataWishlist));
        }

        function getDataFromStorage() {
            let data = localStorage.getItem(localStorageName_Wishlist);
            data = data === null ? [] : JSON.parse(data);

            if (!arraysEqual(wishlistForFab.dataWishlist, data)) {
                wishlistForFab.dataWishlist = data;
                return true;
            }
            
            return false;
        }
        //#endregion

        //#region Observers
        function observePageChanges() {
            // Watch for new elements being added
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // Check if this node or its children contain thumbnails
                            const thumbnails = node.querySelectorAll ? node.querySelectorAll(selector_StoreListing) : [];
                            thumbnails.forEach(thumb => manipulateStoreListing(thumb));
                            
                            // Also check if the node itself is a thumbnail
                            if (node.matches && node.matches(selector_StoreListing)) {
                                manipulateStoreListing(node);
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });

            // Handle page navigation
            window.addEventListener('popstate', () => {
                UpdatePageListingData();
                toggleWishlistTab(false);
            });

            window.addEventListener('visibilitychange', () => {
                if (document.hidden) return;
                
                let hasChange = getDataFromStorage();
                if (hasChange) {
                    populateAllWishlistListing(true);
                    populateWishlistExport();
                }
            });
        }
        //#endregion

        //#region Initialization
        function processExistingThumbnails() {
            const thumbnails = document.querySelectorAll(selector_StoreListing);
            console.log(`Wishlist For Fab: Processing ${thumbnails.length} thumbnails`);
            thumbnails.forEach(element => manipulateStoreListing(element));
        }

        this.init = function() {
            console.log('Wishlist For Fab: Initializing...');
            
            getDataFromStorage();
            constructWishlistNav();
            constructWishlistTab();
            processExistingThumbnails();

            if (wishlistForFab.isStoreListingPage()) {
                el_Sidebar = document.querySelector(selector_Sidebar);
                wishlistForFab.idStoreListing = getPageListingID();
                constructWishlistSidebar();
            }

            observePageChanges();
            
            // Process thumbnails again after a delay to catch late-loading content
            setTimeout(processExistingThumbnails, 2000);
            setTimeout(processExistingThumbnails, 5000);
        }
        //#endregion
    };

    // Make the main object globally accessible
    window.wishlistForFab = wishlistForFab;

    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => wishlistForFab.init(), 1000);
        });
    } else {
        setTimeout(() => wishlistForFab.init(), 1000);
    }
}
