const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  followingTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'teacher' }],
  imageURL: {type: String},
}, { timestamps: true });

const Student = mongoose.model('student', studentSchema);

module.exports = Student;