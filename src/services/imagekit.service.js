const ImageKit = require("imagekit");

const imagekit = new ImageKit({
    publicKey: process.env.PUBLIC_KEY,
    privateKey: process.env.PRIVATE_KEY,
    urlEndpoint: process.env.URL_ENDPOINT,
});

async function uploadImage(file) {
    try {
        const response = await imagekit.upload({
            file: file.buffer,
            fileName: file.originalname,
        });
        return response.url;
    } catch (error) {
        throw new Error("Image upload failed");
    }
}
 
module.exports = {
    uploadImage,
};