/**
 * Get last digit (13th number) of Thai Nationality ID
 *
 * @private
 * @param {number} checksum
 * @returns {number} single digit in range [0-9] e.g. 1, 4
 */
const getLastDigit = (checksum) => {
  return (11 - (checksum % 11)) % 10;
};

/**
 * Get random integer number [min, max] (utility function)
 *
 * @private
 * @param {number} min min (integer number)
 * @param {number} max max (integer number)
 * @returns {number} random integer number
 */
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get random Thai Nationality ID
 *
 * @returns {string} random generated Thai Nationality ID
 */
export const generateRandomThaiId = () => {
  let checksum = 0;
  let s = '';
  for (let i = 0; i < 12; i++) {
    const r = getRandomInt(0, 9);
    checksum += (13 - i) * r;
    s += String(r);
  }

  return s + getLastDigit(checksum);
};
