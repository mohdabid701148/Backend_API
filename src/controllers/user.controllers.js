import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudnary} from "../utils/cloudnary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refresh token in DB
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh token"
        );
    }
};
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

const loginUser = asyncHandler(async (req,res) => {
    // req body -> data
    // username or email
    //find the user 
    // password check
    // access and refresh token
    // send cookies
    const {email,username,password} = req.body
    if(!username||!email){
        throw new ApiError(400,"username or email is required")
    }
    const user = await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404, "user does not exist")
    }
    const isPasswordValid =  await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credential")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
);

const options = {
    httpOnly: true,
    secure: true
};

return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    );
})
const logoutUser = asyncHandler(async (req, res) => {

    // 1️⃣ Remove refresh token from DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // removes field
            }
        },
        {
            new: true
        }
    );

    // 2️⃣ Cookie options (same as login)
    const options = {
        httpOnly: true,
        secure: true
    };

    // 3️⃣ Clear cookies
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        );
});
export {registerUser,loginUser,logoutUser}