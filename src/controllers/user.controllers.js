import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudnary} from "../utils/cloudnary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { response } from "express";

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
    if(!(username||email)){
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
const refreshAccessToken = asyncHandler(async (req, res) => {

    // 1️⃣ Get refresh token from cookies or body
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    // 2️⃣ Verify refresh token
    let decodedToken;
    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // 3️⃣ Find user in DB
    const user = await User.findById(decodedToken?._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // 4️⃣ Match refresh token with DB
    if (user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token expired or used");
    }

    // 5️⃣ Generate new tokens
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(user._id);

    // 6️⃣ Cookie options
    const options = {
        httpOnly: true,
        secure: true
    };

    // 7️⃣ Send new tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed"
            )
        );
});
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    // 1️⃣ Validate input
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    // 2️⃣ Get current user (from middleware)
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 3️⃣ Check old password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    // 4️⃣ Prevent same password reuse (optional but recommended)
    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password must be different");
    }

    // 5️⃣ Set new password
    user.password = newPassword;

    // 6️⃣ Save (this will trigger pre-save hook for hashing)
    await user.save();

    // 7️⃣ Remove refresh token (force re-login)
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // 8️⃣ Clear cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully, please login again"
            )
        );
});
const getCurrentUser = asyncHandler(async (req, res) => {

    const user = req.user;

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "User fetched successfully"
            )
        );
});
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudnary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(400, "Error uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );
});
const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    const coverImage = await uploadOnCloudnary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(400, "Error uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});
const getUserProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    const user = await User.findOne({
        username: username.toLowerCase()
    }).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, user, "User profile fetched successfully")
    );
});
const deleteUserAccount = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    // 1️⃣ Check if user exists
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 2️⃣ Delete user (Hard Delete)
    await User.findByIdAndDelete(userId);

    // 3️⃣ Clear cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User account deleted successfully")
        );
});
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    deleteUserAccount,
    getUserProfile
}