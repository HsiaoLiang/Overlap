export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "overlap:theme";

/**
 * Inline script for <head> (see app/layout.tsx). It runs before the page
 * paints, so a saved light/dark choice is applied without a flash.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
