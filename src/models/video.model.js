import mongoose from 'mongoose';
import mongooseAgregatePaginate from 'mongoose-aggregate-paginate-v2'

const videoSchema = new mongoose.Schema({
    videoFile:{
        type:String,
        required:true,
    },
    thumbnail:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    view:{
        type:Number,
        required:true,
    },
    isPublished:{
        type:boolean,
        default:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    }
},{
    timestamps:true
})

export const Video = mongoose.model("Video",videoSchema);