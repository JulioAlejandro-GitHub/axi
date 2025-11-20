const { addSubjects, addFaceCollection, delFaceCollection } = require('../services/recognition/engines/compreface-engine');

const handleAddSubject = async (req, res) => {
    try {
        const { subjectId } = req.body;
        await addSubjects(subjectId);
        res.status(200).json({ message: 'Subject added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding subject', error: error.message });
    }
};

const handleAddFaceCollection = async (req, res) => {
    try {
        const { subjectId, imgName, acceso_id } = req.body;
        await addFaceCollection({ subjectId, imgName, acceso_id });
        res.status(200).json({ message: 'Face added to collection successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding face to collection', error: error.message });
    }
};

const handleDeleteFaceCollection = async (req, res) => {
    try {
        const { image_id } = req.body;
        await delFaceCollection({ image_id });
        res.status(200).json({ message: 'Face deleted from collection successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting face from collection', error: error.message });
    }
};

module.exports = {
    handleAddSubject,
    handleAddFaceCollection,
    handleDeleteFaceCollection
};
