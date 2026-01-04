const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title:{type:String,required:true},
    description:{type:String,required:true},
    videoURL:{type:String,required:true},
    thumbnailURL:{type:String,required:true},
    teacher:{type:mongoose.Schema.Types.ObjectId,ref:'teacher',required:true},
    likes:{type:Number,default:0},
    category:{type:String,required:true}
},{timestamps:true})

const Video = mongoose.model('video', videoSchema);

module.exports = Video;