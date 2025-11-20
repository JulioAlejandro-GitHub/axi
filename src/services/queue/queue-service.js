const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const PriorityQueue = require('js-priority-queue');
const logger = require('../../helpers/logger');
const { emitToRoom } = require('../socket/socket-service');
const postProcessingService = require('../recognition/post-processing-service');

const PRIORITY_LEVELS = {
    CRITICAL: 1,
    HIGH: 2,
    NORMAL: 3,
    LOW: 4,
    BATCH: 5
};

const MAX_QUEUE_SIZE = process.env.MAX_RECOGNITION_QUEUE_SIZE || 100;
const NUM_WORKERS = process.env.RECOGNITION_WORKERS || os.cpus().length;

class RecognitionQueue {
    constructor() {
        this.queue = new PriorityQueue({ comparator: (a, b) => a.priority - b.priority });
        this.workers = [];
        this.activeWorkers = 0;

        this.initializeWorkers();
        logger.info(`RecognitionQueue initialized with ${NUM_WORKERS} workers.`);
    }

    initializeWorkers() {
        for (let i = 0; i < NUM_WORKERS; i++) {
            let xpath = path.resolve(__dirname, '../recognition/recognition-worker.js');

            const worker = new Worker(xpath);
            worker.on('message', async (message) => {
                const { status, results, error, context } = message;
                const jobId = context?.jobId;

                /**
                 * jobId: existe cuando se envia desde el formulario WEB... es lo minimo.... mas de camaras
                 */
                let text_jobId = ``
                if (jobId) {
                    text_jobId = `jobId[${jobId}]`
                }

                this.activeWorkers--; // Worker is now free.

                if (status === 'finished') {

                    logger.info(`******** [${text_jobId}] finished finished finished finished finished`);

                    try {
                        logger.info(`Worker [${worker.threadId}] finished recognition task for camara_id [${context.camera.camara_id}]. Starting post-processing... ${text_jobId}`);

                        // All subsequent processing (DB, notifications) happens on the main thread.
                        const finalResults = await postProcessingService.handleRecognitionResults(results, context);

                        logger.info(`Worker [${worker.threadId}] camara_id[${context.camera.camara_id}] post-processing Finished ... ${text_jobId}`);
                        // logger.info(`finalResults [${finalResults}]`);

                        if (jobId) {
                            // emitToRoom(jobId, 'recognitionComplete', finalResults);
                            emitToRoom(jobId, 'recognitionComplete', results);
        // return res.status(202).json({
        //     message: 'recognitionComplete.',
        //     results,
        //     jobId: jobId
        // });
                        }
                    } catch (processingError) {
                        logger.error(`Error during post-processing for ::`, processingError);
                        if (jobId) {
                            emitToRoom(jobId, 'recognitionError', { message: processingError.message });

        // return res.status(402).json({
        //     message: processingError.message,
        //     jobId: jobId
        // });
                        }
                    }
                } else if (status === 'error') {
                    logger.error(`Worker ${worker.threadId} encountered a recognition error ::`, error);
                    if (jobId) {
                        emitToRoom(jobId, 'recognitionError', { message: error });
                    }
                }

                // Since a worker is free, try to process the next item in the queue.
                this.processQueue();
            });
            worker.on('error', (err) => {
                logger.error(`Worker ${worker.threadId} errored:`, err);
            });
            worker.on('exit', (code) => {
                if (code !== 0) {
                    logger.warn(`Worker ${worker.threadId} stopped with exit code ${code}`);
                }
            });
            this.workers.push(worker);
        }
    }

    addTask(imageBuffer, context, priority = PRIORITY_LEVELS.NORMAL) {
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            logger.warn(`Recognition queue is full (size: ${this.queue.length}). Dropping new task with priority ${priority}.`);
            return;
        }

        // The imageBuffer is now passed directly to the worker.
        const task = { imageBuffer, context };

        logger.info(`Adding task to recognition queue with priority ${priority}. Queue size: ${this.queue.length}`);
        this.queue.queue({ task, priority });
        this.processQueue();
    }

    processQueue() {
        // if (this.activeWorkers >= NUM_WORKERS || this.queue.length === 0) {
        if (this.activeWorkers >= NUM_WORKERS || this.queue.length === 0) {
            return; // All workers are busy or queue is empty
        }

        const worker = this.workers[this.activeWorkers];
        if (worker) {
            this.activeWorkers++;
            const { task, priority } = this.queue.dequeue();
            const { imageBuffer } = task;

            // Ensure the buffer exists and is valid before attempting to transfer.
            if (!imageBuffer || !imageBuffer.buffer) {
                logger.error(`Cannot process task for worker [${worker.threadId}]: Invalid or missing imageBuffer.`);
                this.activeWorkers--;
                this.processQueue(); // Try to process the next item.
                return;
            }

            logger.info(`Assigning task with priority:[${priority}] to worker:[${worker.threadId}]. Tasks remaining:[${this.queue.length}]. Active workers:[${this.activeWorkers}]`);
            // Use a transferList to move the buffer's memory without copying.
            worker.postMessage(task, [imageBuffer.buffer]);
        }
    }

    stop() {
        logger.info('Stopping all recognition workers...');
        this.workers.forEach(worker => worker.terminate());
    }
}

let queueInstance = null;

/**
 * Returns a singleton instance of the RecognitionQueue.
 * This should only be called from the main thread.
 * @returns {RecognitionQueue}
 */
function getQueue() {
    if (!queueInstance) {
        queueInstance = new RecognitionQueue();
    }
    return queueInstance;
}

module.exports = {
    getQueue,
    PRIORITY_LEVELS
};