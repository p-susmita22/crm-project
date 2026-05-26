import asyncHandler from 'express-async-handler';
import Task from '../models/Task.js';

// @desc    Get all tasks for a user (or all for admin)
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  let tasks;
  if (req.user.role === 'Admin') {
    tasks = await Task.find({})
      .populate('assignedTo', 'name')
      .populate('relatedCustomer', 'name customerId phone')
      .populate('relatedLead', 'name phone');
  } else {
    tasks = await Task.find({ assignedTo: req.user._id })
      .populate('assignedTo', 'name')
      .populate('relatedCustomer', 'name customerId phone')
      .populate('relatedLead', 'name phone');
  }
  res.json(tasks);
});

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const { title, description, type, dueDate, relatedCustomer, relatedLead, assignedTo } = req.body;

  const task = new Task({
    title,
    description,
    type,
    dueDate,
    relatedCustomer,
    relatedLead,
    assignedTo: assignedTo || req.user._id,
  });

  const createdTask = await task.save();
  res.status(201).json(createdTask);
});

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await Task.findById(req.params.id);

  if (task) {
    if (req.user.role !== 'Admin' && task.assignedTo.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to update this task');
    }

    task.status = status;
    const updatedTask = await task.save();
    res.json(updatedTask);
  } else {
    res.status(404);
    throw new Error('Task not found');
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (task) {
    if (req.user.role !== 'Admin' && task.assignedTo.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to delete this task');
    }
    
    await task.deleteOne();
    res.json({ message: 'Task removed' });
  } else {
    res.status(404);
    throw new Error('Task not found');
  }
});

export { getTasks, createTask, updateTaskStatus, deleteTask };
