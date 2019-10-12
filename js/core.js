/* 
 * core.js is used to reference every <a href="?"/> and link them to the different
 * hovering functions we support.
 * 
 * It is responsible for checking if links are from known or unknown website and to add events
 * regarding wether we have a template for them or not.
 */
document.addEventListener('DOMContentLoaded', () => {

    /* Keeping track of the current tab is important as we'll need to disable some of the 
     * embed shown while hovering on certain site as some already have hovering functions for profiles 
     * (ex: reddit profiles on reddit)
     */
    let CURRENT_TAB = document.location.href;

    /* Just in case some sites use the pushState js function to navigate across pages. */
    window.onpopstate = () => CURRENT_TAB = document.location.href;

    /* <https://www.chromium.org/Home/chromium-security/extension-content-script-fetches>
     * "Later in 2019, Extension Manifest V3 will become available, requiring cross-origin requests to occur in background pages rather than content scripts.  This new manifest version will have its own migration period, before support for Extension Manifest V2 is eventually removed from Chrome."
     * Using the background script to pull data from APIs safely, i.e forwarding request from the content script to the background script
     * Direct asynchronous messaging, making it as a function to avoid having some request code across every file
     */
    window.survolBackgroundRequest = (url) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'request', data: { url } }, (res) => {
                (res.status == 'OK') ? resolve(res): reject(res);
            });
        });
    };

    /* Takes {String} link
     * Returns {String} link
     * Description: Returns the domain name associated to a full link
     */
    function getDomain(link) {
        const subdomains = link.replace('http://', '').replace('https://', '').split('/')[0].split('.').length;

        return link.replace('http://', '').replace('https://', '').split('/')[0].split('.').slice(subdomains - 2, subdomains).join('.');
    }

    /* Node is a DOM Node 
     * domain is a string
     * Description: Returns the correct hover CLass for a given domain.
     */
    function getPotentialHover(node, domain) {
        switch (domain) {
            case 'reddit.com':
                return new RedditHover(node, getDomain(CURRENT_TAB));
            case 'wikipedia.org':
                return new WikipediaHover(node, getDomain(CURRENT_TAB));
            case 'youtube.com':
            case 'youtu.be':
                return new YoutubeHover(node, getDomain(CURRENT_TAB));
            case 'twitter.com':
                return new TwitterHover(node, getDomain(CURRENT_TAB));
            default:
                return null;
                //return new BaseHover(node);
        }
    }

    /* Checks if the hover class is working with the given link and deletes it if it's not.
     * takes 
     * {Node} node
     * {String} link
     */
    function dispatcher(node, link) {
        const domain = getDomain(link);
        let potentialHover = getPotentialHover(node, domain);

        /* If we do not support the domain we might not get anything in return of getPotentialHover */
        if (potentialHover) {
            
            /* If the potentialHover can't handle the link feed it to the garbage collector */
            if (potentialHover.checkLinkType() === 'unknown') potentialHover = null;

            /* Else bind it */
            else potentialHover.bindToNode();
        }
    }

    /* Retrieves every <a> element on the page
     * it is separated as some sites need to reload displayed elements (ex: Twitter deletes nodes out of the screen)
     * resolves a Nodelist see <https://developer.mozilla.org/fr/docs/Web/API/Document/querySelectorAll>
     * 
     * TODO : Find a way to search for nodes in some sections only on certain known sites ?
     */
    function gatherHrefs() {
        return new Promise((resolve, reject) => {
            document.querySelectorAll('a').length ? resolve(document.querySelectorAll('a')) : reject('Can\'t find a single <a> node');
        });
    }

    /* Takes a nodelist as an argument 
     * TODO: Once done, resolve / reject 
     * In case of success, go to another function displaying the number of previews on the page ?
     */
    function equipNodes(nodes) {
        return new Promise((resolve, reject) => {
            nodes.forEach((node) => {
                if (node.href) dispatcher(node, node.href);
            });
        });
    }

    gatherHrefs()
        .then(equipNodes);
});