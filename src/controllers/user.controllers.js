import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { UploadOnClodinary } from "../utils/clodinary.js";
import { ApiResponse } from "../utils/Apiresponse.js";


const registerUser = asynchandler(async (req,res)=>{
    //get user details
    
    const {username, email, fullName, password } = req.body

    if (
        [username, email, fullName, password].some((field)=>{field?.trim() === ""})
    ){
           throw new ApiError(400,"All fields is required")
    }

    const existedUser= User.findOne({$or:[{username},{email}]})

    if (existedUser) {
        throw new ApiError(409,"User with this email or username exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;


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
        username: username.toLowerCase()

    })

    const createdUser = await User.findById(_id).select(
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

