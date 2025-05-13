import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import { ApiError } from "./ApiError.js";
import { ApiResponse } from "./ApiResponse.js";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.error('cold not find the path');
        }
        let response =  await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        // console.log('file upload'+response.url);
        fs.unlinkSync(localFilePath);
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath)
    }
}

let deleteFromCloudinary = async (public_id) => {
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        
        console.log("Cloudinary deletion result:", result);
        return result; // success object like { result: "ok" }
    } catch (error) {
        
        throw new ApiError(500, "Failed to delete from Cloudinary", error?.message);
    }
};

cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
    { public_id: 'shoes' },
    function (error, result) {
        console.log(result);
    })

export { uploadOnCloudinary, deleteFromCloudinary };
