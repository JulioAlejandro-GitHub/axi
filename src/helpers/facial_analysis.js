/**
 * Utility functions for facial analysis.
 */

/**
 * Checks if a detected face is positioned frontally, based on rotation angles.
 * @param {object} face - A face object from the Human library result.
 * @returns {boolean} - True if the face pose is considered frontal, false otherwise.
 */
const isPoseFrontal = (face) => {
    // Thresholds for yaw and pitch in degrees. A face is considered "frontal"
    // if its rotation is within these +/- degrees from the center.
    const YAW_THRESHOLD_DEGREES = 15;
    const PITCH_THRESHOLD_DEGREES = 15;

    // The Human library provides angles in radians. Convert degrees to radians for comparison.
    const YAW_THRESHOLD_RADIANS = (YAW_THRESHOLD_DEGREES * Math.PI) / 180;
    const PITCH_THRESHOLD_RADIANS = (PITCH_THRESHOLD_DEGREES * Math.PI) / 180;

    // Check if rotation data is available.
    if (!face || !face.rotation || !face.rotation.angle) {
        // If no rotation data, we cannot determine the pose.
        // Default to false to be safe, as we only want to process faces we are confident about.
        return false;
    }

    const { yaw, pitch } = face.rotation.angle;

    // Check if the absolute yaw and pitch are within the defined thresholds.
    const isFrontal =
        Math.abs(yaw) < YAW_THRESHOLD_RADIANS &&
        Math.abs(pitch) < PITCH_THRESHOLD_RADIANS;

    return isFrontal;
};

module.exports = {
    isPoseFrontal,
};
