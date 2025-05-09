import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

let videoSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    videoFile: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        required: true,
    },
    owner: [
        {
            typeof: mongoose.Types.ObjectId,
            ref: 'User'
        }
    ],
    title:{
        type: String,
        required: true,
    },
    discription:{
        type: String,
        required: true,
    },
    duration:{
        type: Number,
        required: true,
    },
    views:{
        type: Number,
        default:0,
        required: true,
    },
    isPublised:{
        type: Boolean,
        required: true,
    },
}, { timestamps });

videoSchema.plugin(mongooseAggregatePaginate)
export let Video = mongoose.model("Video", videoSchema);