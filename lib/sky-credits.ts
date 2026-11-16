/*
 * The sky photos (assets/sky) and who took them. All five come from
 * Wikimedia Commons under Creative Commons licences that ask for the author
 * to be named, which the /credits page does.
 */

export type SkyCredit = {
  /** Which part of the day the photo is used for. */
  part: string;
  title: string;
  author: string;
  licence: "CC BY 4.0" | "CC BY-SA 4.0";
  source: string;
};

export const LICENCE_URLS = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
} as const;

export const SKY_CREDITS: SkyCredit[] = [
  {
    part: "Night",
    title: "Milky Way over the valley of Marukha River, Arkhyz, Russia",
    author: "Alexander Kurilov",
    licence: "CC BY 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Milky_Way_over_the_valley_of_Marukha_River%2C_Arkhyz%2C_Russi%D0%B0.jpg",
  },
  {
    part: "Dawn",
    title:
      "Silhouette of an island at sunset with blue sky pink and yellow clouds in Don Det Si Phan Don Laos",
    author: "Basile Morin",
    licence: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Silhouette_of_an_island_at_sunset_with_blue_sky_pink_and_yellow_clouds_in_Don_Det_Si_Phan_Don_Laos.jpg",
  },
  {
    part: "Day",
    title: "Clouds and blue sky in Russia. IMG 026",
    author: "Dmitry Makeev",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Clouds_and_blue_sky_in_Russia._IMG_026.jpg",
  },
  {
    part: "Sunset",
    title: "Cumulonimbus sunset panorama, Albury NSW Australia",
    author: "Thennicke",
    licence: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Cumulonimbus_sunset_panorama%2C_Albury_NSW_Australia.jpg",
  },
  {
    part: "Dusk",
    title: "Nautical twilight sunset over Sandy Lake (DSCF3005)",
    author: "Trougnouf",
    licence: "CC BY 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Nautical_twilight_sunset_over_Sandy_Lake_%28DSCF3005%29.jpg",
  },
];
