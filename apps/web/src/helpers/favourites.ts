export const toggleFavourite = (favourites: string[], courseId: string) =>
  favourites.includes(courseId)
    ? favourites.filter((favourite) => favourite !== courseId)
    : [...favourites, courseId];

export const removeFavourite = (favourites: string[], courseId: string) =>
  favourites.filter((favourite) => favourite !== courseId);
