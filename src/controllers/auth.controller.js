const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const emailService = require('../services/emailSender.service');
const { uploadImage } = require('../services/imagekit.service');

async function StudentRegister(req, res) {
  const{ username, password, email, } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let imageURL = '';
    const file = req.file;
    if (file) {
      try {
        imageURL = await uploadImage(file);
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr.message || uploadErr);
      }
    }
    const student = await Student.create({
      username: username,
      password: hashedPassword,
      email: email,
      followingTeachers: [],
      imageURL: imageURL
    });
    const token = jwt.sign({ student }, process.env.JWT_SECRET, { expiresIn: '24h' },{httpOnly:true});
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // REQUIRED on Vercel (HTTPS)
      sameSite: "none",    // REQUIRED for cross-origin
      path: "/"
    });
    res.status(201).json({ message: student._id, userData: student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function StudentLogin(req, res) {
  const { username, password } = req.body;

  try {
    const student = await Student.findOne({
      username: username
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ student }, process.env.JWT_SECRET, { expiresIn: '24h' },{httpOnly:true});
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // REQUIRED on Vercel (HTTPS)
      sameSite: "none",    // REQUIRED for cross-origin
      path: "/"
    });

    res.json({ message: student._id, userData: student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function StudentLogout(req, res) {
  // expire the cookie explicitly (set empty value + past expiry) with same options
  res.cookie('token', '', { httpOnly: true, sameSite: 'lax', path: '/', expires: new Date(0) });
  res.json({ message:" Student logged out successfully" }); 
}   

async function TeacherRegister(req, res) {
    const{ username, password, email, subjects } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // ensure subjects is an array if sent as JSON string from a multipart/form-data request
        let parsedSubjects = subjects;
        if (typeof subjects === 'string') {
          try { parsedSubjects = JSON.parse(subjects); } catch (e) { parsedSubjects = subjects ? [subjects] : []; }
        }

        let imageURL = '';
        const file = req.file;
        if (file) {
          try { imageURL = await uploadImage(file); } catch (uploadErr) { console.error('Image upload failed:', uploadErr.message || uploadErr); }
        }

        const teacher = await Teacher.create({
            username: username,
            password: hashedPassword,
            email: email,
            subjects: parsedSubjects,
            imageURL: imageURL,
            followers: []
        });
        const token = jwt.sign({ teacher }, process.env.JWT_SECRET, { expiresIn: '24h' },{httpOnly:true});
        res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
        res.status(201).json({ message: teacher._id, useData: teacher });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function TeacherLogin(req, res) {
    const { email, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ email: email });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ teacher }, process.env.JWT_SECRET, { expiresIn: '24h' },{httpOnly:true});
        res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
        res.json({ message: teacher._id, userData: teacher });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

function TeacherLogout(req, res) {
  // expire the cookie explicitly (set empty value + past expiry) with same options
  res.cookie('token', '', { httpOnly: true, sameSite: 'none', secure: true, path: '/', expires: new Date(0) });
  res.json({ message: 'Teacher logged out successfully' });
}

async function sendEmail(req,res){
  const { to, subject, text, html } = req.body;
  try {
    await emailService.sendMail(to,subject, text, html);
    res.status(200).json({ status: 'success', message: 'Email sent successfully' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: 'Email not sent', error: error.message });
  }
}

// Get student profile (GET/POST)
async function getStudentProfile(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.student || !decoded.student._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const student = await Student.findById(decoded.student._id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Return data in format expected by frontend
    res.json({
      username: student.username,
      email: student.email,
      profileImage: student.imageURL || '',
      imageURL: student.imageURL || ''
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update student profile (PUT)
async function updateStudentProfile(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.student || !decoded.student._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const student = await Student.findById(decoded.student._id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update fields
    const updateData = {};
    
    if (req.body.username) {
      updateData.username = req.body.username;
    }
    
    if (req.body.email) {
      updateData.email = req.body.email;
    }
    
    // Handle password update (only if provided and not empty)
    if (req.body.password && req.body.password.trim() !== '') {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Handle image upload
    if (req.file) {
      try {
        const imageURL = await uploadImage(req.file);
        updateData.imageURL = imageURL;
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr.message || uploadErr);
        // Continue with other updates even if image upload fails
      }
    }

    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      decoded.student._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Return updated data in format expected by frontend
    res.json({
      username: updatedStudent.username,
      email: updatedStudent.email,
      profileImage: updatedStudent.imageURL || '',
      imageURL: updatedStudent.imageURL || ''
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    // Handle duplicate key errors (unique constraint violations)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    res.status(500).json({ error: error.message });
  }
}

// Keep editStudentAccount for backward compatibility (GET/POST)
async function editStudentAccount(req, res) {
  return getStudentProfile(req, res);
}

// Delete student account
async function deleteStudentAccount(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.student || !decoded.student._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const student = await Student.findById(decoded.student._id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete the student account
    await Student.findByIdAndDelete(decoded.student._id);

    // Clear the cookie
    res.cookie('token', '', { httpOnly: true, sameSite: 'none', secure: true, path: '/', expires: new Date(0) });

    res.json({ message: 'Student account deleted successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Get teacher profile (GET/POST)
async function getTeacherProfile(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacher._id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Return data in format expected by frontend
    res.json({
      username: teacher.username,
      email: teacher.email,
      profileImage: teacher.imageURL || '',
      imageURL: teacher.imageURL || '',
      subjects: teacher.subjects || []
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update teacher profile (PUT)
async function updateTeacherProfile(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacher._id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update fields
    const updateData = {};
    
    if (req.body.username) {
      updateData.username = req.body.username;
    }
    
    if (req.body.email) {
      updateData.email = req.body.email;
    }
    
    // Handle subjects update (array)
    if (req.body.subjects !== undefined) {
      let parsedSubjects = req.body.subjects;
      if (typeof parsedSubjects === 'string') {
        try {
          parsedSubjects = JSON.parse(parsedSubjects);
        } catch (e) {
          parsedSubjects = parsedSubjects ? [parsedSubjects] : [];
        }
      }
      updateData.subjects = Array.isArray(parsedSubjects) ? parsedSubjects : [];
    }
    
    // Handle password update (only if provided and not empty)
    if (req.body.password && req.body.password.trim() !== '') {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Handle image upload
    if (req.file) {
      try {
        const imageURL = await uploadImage(req.file);
        updateData.imageURL = imageURL;
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr.message || uploadErr);
        // Continue with other updates even if image upload fails
      }
    }

    // Update teacher
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      decoded.teacher._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Return updated data in format expected by frontend
    res.json({
      username: updatedTeacher.username,
      email: updatedTeacher.email,
      profileImage: updatedTeacher.imageURL || '',
      imageURL: updatedTeacher.imageURL || '',
      subjects: updatedTeacher.subjects || []
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    // Handle duplicate key errors (unique constraint violations)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete teacher account
async function deleteTeacherAccount(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacher._id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Delete the teacher account
    await Teacher.findByIdAndDelete(decoded.teacher._id);

    // Clear the cookie
    res.cookie('token', '', { httpOnly: true, sameSite: 'none', secure: true, path: '/', expires: new Date(0) });

    res.json({ message: 'Teacher account deleted successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function editTeacherAccount(req, res) {
  //const token = req.cookie.token;
  //if (!token) {
    //return res.status(401).json({ error: 'Unauthorized: No token provided' });
  //}
  try{
    //const user = jwt.verify(token, process.env.JWT_SECRET)
    res.send("kaak")
    console.log(user)
  }catch(err){
    res.status(500).json({ error: err.message });
  }
}
module.exports = {
  StudentRegister,
  StudentLogin,
  StudentLogout,
  TeacherRegister,
  TeacherLogin,
  TeacherLogout,
  sendEmail,
  editStudentAccount,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentAccount,
  editTeacherAccount,
  getTeacherProfile,
  updateTeacherProfile,
  deleteTeacherAccount
}; 