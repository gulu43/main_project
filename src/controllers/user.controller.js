import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

let generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        let user = await User.findById(userId)
        let accessToken = user.generateAccessToken()
        let refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "error while generating refresh or access token");

    }
}

export const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //         message: "ok"
    // })

    const { fullName, email, username, password } = req.body
    console.log('email', email);
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "all fields are required")
    }

    let existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "user exsist");
    }
    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path ;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    } else {
        coverImageLocalPath = "";
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avtar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    let coverImage = { url: "" };
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar) {
        throw new ApiError(400, "avtar is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "something went roung while registaring the user");

    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

export const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required!");
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user does not exites, please register first then login");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "password is incorrect");
    }

    let { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const option = {
        httpOnly: true,
        secure: true
    }
    return res.
        status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

export const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true,
        }

    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefrenceToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incommingRefrenceToken) {
        throw new ApiError(401, "Unauthorised request");
    }
    try {
        const decodedToken = jwt.verify(incommingRefrenceToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token");
        }

        if (incommingRefrenceToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh-token is expired or used");
        }

        const option = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newRefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access Token refresh"

                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token use.controller.js error")
    }
})

export const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassowrd } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password");
    }
    user.password = newPassowrd
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password is updated "))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched"))
})

export const updatedAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, {}, "fields are empty");
    }
    const user = await User.findByIdAndUpdate(req.user?._id)
    user
        .status(200)
        .json(200, {
            $set: {
                fullName: fullName,
                email: email,
            }
        }).select(["-password"])

    return res
        .status(200)
        .json(new ApiResponse(200, user, "fields updated"))
})

export const updatedAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is Missing, Try again");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "error while uploading the avatar");
    }

    // getting old data from db to delete the last avatar
    const secondLastUpdatedData = await User.findById(req.user?._id)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: avatar.url,
        },
        { new: true }

    ).select(["-password"])

    if (oldUserData?.avatar?.public_id) {
        await deleteFromCloudinary(oldUserData.avatar.public_id);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "avatar updated"))

    // delete old Image 
})

export const updateCoverImg = asyncHandler(async (req, res) => {
    const coverImgLocalPath = req.file?.path

    if (!coverImgLocalPath) {
        throw new ApiError(400, "coverImg is Missing, Try again");
    }

    const coverImage = await uploadOnCloudinary(coverImgLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "error while uploading the coverImg");
    }

    // getting old data from db to delete the last avatar
    const secondLastUpdatedData = await User.findById(req.user?._id)

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: coverImage.url,
        },
        { new: true }
    ).select(["-password"])

    if (secondLastUpdatedData?.coverImage?.public_id) {
        await deleteFromCloudinary(secondLastUpdatedData.coverImage.public_id)
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "coverimg updated"))
})

export const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req?.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: _id,
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: _id,
                foreignField: "subscriber",
                as: "subscriedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $count: "$subscribers"
                },
                channelsSubscriedToCount: {
                    $count: "$subscriedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscriptions.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscriedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,

            }
        }
    ])


    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists");

    }
    return res.status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})

export const getWatchHistory = asyncHandler(async (req, res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)

            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "watch History fetched succesfully" )
    )
})

