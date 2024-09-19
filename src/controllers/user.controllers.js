import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { UploadOnClodinary } from "../utils/clodinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";


const registerUser = asynchandler(async (req,res)=>{
    //get user details
    
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

export {registerUser}

