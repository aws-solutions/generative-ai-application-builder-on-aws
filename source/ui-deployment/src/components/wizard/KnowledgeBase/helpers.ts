/**
 * Utility function to convert a numeric relevency score to a Kendra score
 * @param {number} score
 * @returns {string} Kendra score
 */
export const scoreToKendraMapping = (score: number) => {
    if (score < 0 || score > 1.0) {
        throw new Error('Score expected to be between 0 and 1');
    }

    if (score == 1.0) {
        return 'VERY_HIGH';
    } else if (score >= 0.75) {
        return 'HIGH';
    } else if (score >= 0.5) {
        return 'MEDIUM';
    } else if (score >= 0.25) {
        return 'LOW';
    } else {
        //Kendra in the background refers to this state as NOT_AVAILABLE; however, in the context
        //of setting a threshold, DISABLED reads better for customers so using this nomenclature instead
        return 'DISABLED';
    }
};
