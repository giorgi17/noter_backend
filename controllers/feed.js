const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

const io = require('../config/socket');
const logger = require('../utils/logger');
const Note = require('../models/note');
const User = require('../models/user');
const NoteHistory = require('../models/noteHistory');
const cache = require('../config/cache');

exports.createNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        error.data = errors.array();
        next(error);
        logger.error(`createNote error - ${error}`);
        return error;
    }

    const imageUrl = req.file?.path;
    const title = req.body.title;
    const content = req.body.content;

    const note = new Note({
        title,
        content,
        imageUrl,
        creator: req.userId,
    });

    try {
        await note.save();
        const user = await User.findById(req.userId);
        user.notes.push(note);
        const savedUser = await user.save();

        io.getIO().emit('notes', {
            action: 'create',
            note: {
                ...note._doc,
                creator: { _id: req.userId, name: user.name },
            },
        });
        cache.getCache().del('notes');
        logger.info(`Note created - ${note._id}`);
        res.status(201).json({
            message: 'Note created successfully!',
            note,
            creator: { _id: user._id, name: user.name },
        });

        return savedUser;
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        logger.error(`createNote error - ${err}`);
        next(err);
        return err;
    }
};

exports.getNotes = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        error.data = errors.array();
        next(error);
        logger.error(`getNotes error - ${error}`);
        return error;
    }

    const currentPage = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 5;

    try {
        const totalItems = await Note.find().countDocuments();
        const hasNext = totalItems - currentPage * perPage > 0;

        let notes = await Note.find()
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        // TODO: Temporarily disabled because it's not working correctly
        // if (cache.getCache().has('notes')) {
        //     notes = cache.getCache().get('notes');
        // } else {
        //     cache.getCache().set('notes', notes, 3000);
        // }

        logger.info(`Fetched notes - totalItems: ${totalItems}`);
        res.status(200).json({
            message: 'Fetched notes successfully.',
            notes,
            totalItems,
            currentPage,
            hasNext,
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        logger.error(`getNotes error - ${err}`);
        next(err);
        return err;
    }
};

exports.getNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        logger.error(`updateNote error - ${errors}`);
        next(error);
        return error;
    }

    const noteId = req.params.noteId;

    try {
        const note = await Note.findById(noteId).populate('noteHistory');
        if (!note) {
            const error = new Error('Cound not find note.');
            error.statusCode = 404;
            throw error;
        }

        logger.info(`Fetched note - totalItems: ${note._id}`);
        res.status(200).json({ message: 'Note fetched.', note });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        logger.error(`getNote error - ${err}`);
        next(err);
        return err;
    }
};

exports.updateNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        logger.error(`updateNote error - ${errors}`);
        next(error);
        return error;
    }

    const noteId = req.params.noteId;
    const title = req.body.title;
    const content = req.body.content;

    let newImageUrl;
    if (req.file) {
        newImageUrl = req.file.path;
    }

    try {
        const note = await Note.findById(noteId);

        if (!note) {
            const error = new Error('Cound not find note.');
            error.statusCode = 404;
            throw error;
        }

        if (note.creator.toString() !== req.userId) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }

        if (newImageUrl && note.imageUrl) {
            clearImage(note.imageUrl);
        }

        let historyId = note.noteHistory;

        // Saving history
        let noteHistory = null;
        if (!historyId) {
            noteHistory = new NoteHistory({
                history: [
                    { changes: { title, content } },
                    { changes: { title: note.title, content: note.content } },
                ],
            });

            const newHistory = await noteHistory.save();
            historyId = newHistory._id;
        } else {
            noteHistory = await NoteHistory.findById(historyId);
            noteHistory.history.push({
                changes: {
                    title,
                    content,
                },
            });
            await noteHistory.save();
        }

        note.title = title;
        note.content = content;
        note.noteHistory = historyId;
        if (newImageUrl) {
            note.imageUrl = newImageUrl;
        }

        const savedNote = await note.save();
        io.getIO().emit('notes', { action: 'update', note: savedNote });
        cache.getCache().del('notes');

        logger.info(`Note updated - ${note._id}`);
        res.status(200).json({ message: 'Note updated!', note });
        return { note, noteHistory };
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        logger.error(`updateNote error - ${err}`);
        next(err);
        return err;
    }
};

exports.deleteNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        logger.error(`updateNote error - ${errors}`);
        next(error);
        return error;
    }

    const noteId = req.params.noteId;

    try {
        const note = await Note.findById(noteId);
        if (!note) {
            const error = new Error('Cound not find note.');
            error.statusCode = 404;
            throw error;
        }
        if (note.creator.toString() !== req.userId) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }

        if (note.imageUrl) {
            clearImage(note.imageUrl);
        }
        await Note.findByIdAndRemove(noteId);

        const user = await User.findById(req.userId);
        user.notes.pull(noteId);
        await user.save();

        io.getIO().emit('notes', { action: 'delete', note: noteId });
        cache.getCache().del('notes');
        logger.info(`Deleted note - ${noteId}`);
        res.status(200).json({ message: 'Deleted note.' });
        return user;
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }

        logger.error(`deleteNote error - ${err}`);
        next(err);
        return err;
    }
};

exports.searchNotes = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, invalid data was entered!');
        error.statusCode = 422;
        error.data = errors.array();
        logger.error(`searchNotes error - ${error}`);
        next(error);
        return error;
    }

    const searchText = req.query.searchText || '';
    const currentPage = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 5;

    const searchTextRegExp = new RegExp(searchText, 'i');

    try {
        const totalItems = await Note.find({
            $or: [
                { title: { $regex: searchTextRegExp } },
                { content: { $regex: searchTextRegExp } },
            ],
        }).countDocuments();
        const hasNext = totalItems - currentPage * perPage > 0;

        const notes = await Note.find({
            $or: [
                { title: { $regex: searchTextRegExp } },
                { content: { $regex: searchTextRegExp } },
            ],
        })
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        logger.info(`Fetched searched notes - totalItems: ${totalItems}`);
        res.status(200).json({
            message: 'Fetched notes successfully.',
            notes,
            totalItems,
            currentPage,
            hasNext,
        });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }

        logger.error(`searchNotes error - ${error}`);
        next(error);
        return error;
    }
};

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err =>
        logger.error(
            `Failed to delete file - ${filePath}, error message: ${err}`
        )
    );
};
