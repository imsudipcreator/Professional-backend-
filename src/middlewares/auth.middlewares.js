import { ApiError } from "../utils/Apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from 'jsonwebtoken';
import { User } from "../models/user.models.js";


export const verifyJWT =asynchandler(async(req,_,next)=>{
    try {
        const Token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!Token){
            throw new ApiError(401,"Unauthorized request")
            
        }
    
        const decodedToken = jwt.verify(Token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
        req.user=user
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || " Invalid access token ")
        
    }

})