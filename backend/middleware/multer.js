import multer from "multer";
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, '/'); // Or any existing folder
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    },
});

const upload = multer({storage:storage})

export default upload;