import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudnary} from "../utils/cloudnary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req,res)=>{

    // get user detaits from frontend
    // validation
    // check if user already exists: username , email;
    // check for avatar 
    // upload them to cloudnary
    // create user object - create entery in db 
    // remove passwaord and refresh token field from response
    // check for user creation 
    // return response

    const {username,email,fullname,password} = req.body
    console.log("email : ", email)

    // if(fullname===""){
    //     throw new ApiError(400,"fullname is required");
    // }
    if(
        [username,email,fullname,password].some((field)=> 
        field?.trim()==="")
    ){
        throw new ApiError(400,"some field is required")
    }

    //check user exist or not
    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    console.log(existedUser);

    if(existedUser){
        throw new ApiError(409,"user with email or username already exist")
    }

    // filehandling
    const avatar_local_path = req.files?.avatar[0]?.path
    const coverImage_local_path = req.files?.coverimage[0]?.path
    console.log(coverImage_local_path)

    if(!avatar_local_path){
        throw new ApiError(400,"avatar file is required")
    }

    const avatar = await uploadOnCloudnary(avatar_local_path)
    const coverimage = await uploadOnCloudnary(coverImage_local_path)

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }
   

    const user = await User.create({
        password,
        fullname,
        avatar : avatar.url,
        coverImage : coverimage.url||"",
        email,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "something went wrong while regestring the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})



export {registerUser}