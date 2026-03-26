import {v2 as cloudinary} from 'cloudinary';
import { Console } from 'console';
import fs from 'fs';

cloudinary.config({
    cloud_name:process.env.CLOUDNARY_CLOUD_NAME,
    api_key:process.env.CLOUDNARY_API_KEY,
    api_secret:process.env.CLOUDNARY_API_SECRET
})

const uploadOnCloudnary = async (localFilePath)=>{
    try {
        if(!localFilePath)return null;
        //upload the file on cloudnary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
        //file has been uploaded on cloudnary successfully
        console.log(`file is uploaded on cloudnary successfully ${response.url}` )
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally save temprorally file
        return null;
    }
}
export {uploadOnCloudnary}