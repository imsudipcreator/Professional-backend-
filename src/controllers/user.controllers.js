import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { UploadOnClodinary } from "../utils/clodinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from 'jsonwebtoken';




const generateAccessandRefreshTokens=async(userId)=>{
    try {
        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}


const registerUser = asynchandler(async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    
    const {userName, email, fullName, password } = req.body

    if (
        [userName, email, fullName, password].some((field)=>{field?.trim() === ""})
    ){
           throw new ApiError(400,"All fields is required")
    }

    const existedUser= await User.findOne({$or:[{userName},{email}]})

    if (existedUser) {
        throw new ApiError(409,"User with this email or username exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
    
    const avatar = await UploadOnClodinary(avatarLocalPath);
    const coverImage = await UploadOnClodinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }


    const user =await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase(),

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})

const loginUser = asynchandler(async(req,res)=>{
    // req.body --> data
    // username or email
    // check if user exists: username, email
    // password check
    // access and refresh token
    // return res
    // send cookie

     const {email , userName , password} = req.body
     console.log(userName)
     console.log(email)
     console.log(password)

    if (!userName && !email) {
        throw new ApiError(400, "Username or Email required")
    }

    const user =await User.findOne({
        $or:[{ userName },{ email }]
    })


    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
 
    if (!isPasswordValid) {
        throw new ApiError(401, "Wrong password")
    }



    const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
               user: loggedInUser , accessToken , refreshToken 
            },
            "User logged in successfully"
        )
    )

})


const logoutUser = asynchandler(async(req,res)=>{
    await User.findByIdAndUpdate(
    req.user._id,
    {
       $set: {refreshToken: undefined}
    },
    {
        new: true
    }
   )
   const options ={
    httpOnly: true,
    secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
    
    
})


const refreshAccessToken = asynchandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        
        const user =await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used");
            
        }
    
        options={
            httpOnly : true,
            secure : true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessandRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken , options )
        .cookie("refreshToken", newRefreshToken, options )
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,newRefreshToken
                },
                "Access token refreshed"
    
            )
        )
        
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }

})



export {registerUser,loginUser,logoutUser,refreshAccessToken}

