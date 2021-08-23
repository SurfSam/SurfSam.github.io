import numpy as np
import tensorflow as tf
import pandas as pd

import os
import json

from tensorflow import keras
from tensorflow.keras import layers
import matplotlib.pyplot as plt

import flask
from flask_cors import CORS, cross_origin

from flask import request, jsonify
from random import randrange

SLICE_LENGTH = 28
MAX_ID = 56

DATA_TYPE = "random"

CLUSTER_LENGTH = 16
INPUT_WIDTH = 8
N_EPOCHS = 600

MIN_SLICES = 50
VARIETY_MARGIN = 0.5

SAVE_PATH = '../saves/'
FILENAME = 'LSTMariov7.1.' + DATA_TYPE + '.CL' + str(CLUSTER_LENGTH) + '.h5'
MODEL = None

def read_data(path):
    slice_files = os.listdir(path)

    read_data = []

    for file in slice_files:
        f = open(path + '/' + file)

        data = json.load(f)

        # min amount of slices = 50
        if len(data) >= MIN_SLICES:
            read_data.append(data)

    clustered_data = []
    clustered_labels = []
    filtered_count = 0
    for area in read_data:

        for i in range(0, len(area)-CLUSTER_LENGTH):

            # split into data and label
            data = np.array(area[i:i+INPUT_WIDTH])
            label = np.array(area[i+INPUT_WIDTH:i+CLUSTER_LENGTH])

            # filter out slices with not enough variation
            # by comparing the slice avg to the label
            # grab the average within each horizontal array
            # data_avg = np.average(data, axis=0)

            # variety = np.linalg.norm(data_avg - label)
            # # subtract the label from the data_average and get the magnitude of the resulting vector
            # if variety >= VARIETY_MARGIN:
            # divide by MAX_ID for 0-1 range
            data = np.divide(data, MAX_ID)
            label = np.divide(label, MAX_ID)

            # add data and label to array
            clustered_data.append(tf.reshape(
                data, [INPUT_WIDTH, SLICE_LENGTH]))
            clustered_labels.append(tf.reshape(
                label, [INPUT_WIDTH, SLICE_LENGTH]))
            # else:
            #     filtered_count += 1
            #     print('Sorted out', data, label, variety)

    print('Loaded', len(clustered_data), 'clusters, discarded', filtered_count)

    return np.asarray(clustered_data), np.asarray(clustered_labels)

def plotHistory(history):
    # summarize history for accuracy
    plt.plot(history.history['accuracy'])
    plt.title('model accuracy')
    plt.ylabel('accuracy')
    plt.xlabel('epoch')
    plt.ylim(0, 1)
    plt.xlim(0, N_EPOCHS)
    # plt.legend(['train', 'test'], loc='upper left')
    plt.show()
    # summarize history for loss
    plt.plot(history.history['loss'])
    plt.title('model loss')
    plt.ylabel('loss')
    plt.xlabel('epoch')
    plt.xlim(0, N_EPOCHS)
    # plt.legend(['train', 'test'], loc='upper left')
    plt.show()

# read clusters and labels
clustered_data, clustered_labels = read_data(
    '../' + DATA_TYPE + '_data')

# if no saved model exists -> train a new one
if not os.path.isfile(SAVE_PATH + FILENAME):

    # # create dataset from clusters and labels
    # train_data = tf.data.Dataset.from_tensor_slices(
    #     (clustered_data, clustered_labels))

    print('Shapes -- Data:', clustered_data.shape,
          '-- Labels:', clustered_labels.shape)
    # shuffle data
    # train_data = train_data.shuffle(10)

    MODEL = keras.Sequential()

    MODEL.add(layers.Input((INPUT_WIDTH, SLICE_LENGTH)))

    # MODEL.add(layers.LSTM(128, activation='relu', return_sequences=True))
    # # MODEL.add(layers.Dropout(0.2))

    # MODEL.add(layers.LSTM(128, activation='relu'))
    # # MODEL.add(layers.Dropout(0.2))

    # MODEL.add(layers.Dense(SLICE_LENGTH * 2, activation='relu'))
    # # MODEL.add(layers.Dropout(0.2))

    # # Dense layer with SLICE_LENGTH as output
    # MODEL.add(layers.Dense(SLICE_LENGTH, activation='relu'))


    MODEL.add(layers.Dense(SLICE_LENGTH * INPUT_WIDTH, activation='relu'))

    MODEL.add(layers.Dense(SLICE_LENGTH * INPUT_WIDTH, activation='relu'))

    MODEL.add(layers.LSTM(SLICE_LENGTH, activation='relu', input_shape=(INPUT_WIDTH, SLICE_LENGTH), return_sequences=True))

    MODEL.compile(loss='mse',
                  optimizer=keras.optimizers.Adam(
                      learning_rate=1e-3, decay=1e-5),
                  metrics=['accuracy'])

    MODEL.summary()

    # train model
    history = MODEL.fit(x=clustered_data, y=clustered_labels, epochs=N_EPOCHS)
    
    # save model
    MODEL.save(SAVE_PATH + FILENAME)

    plotHistory(history)
    print('Saved model', FILENAME)

# if it does exist -> create the backend for requests
else:

    MODEL = keras.models.load_model(SAVE_PATH + FILENAME)
    print("Loaded existing model", FILENAME)
    MODEL.summary()

    app = flask.Flask(__name__)
    app.config["DEBUG"] = True
    cors = CORS(app)
    app.config['CORS_HEADERS'] = 'Content-Type'

    @app.route('/', methods=['GET'])
    @cross_origin()
    def fetch():

        # fail early if model not loaded
        if(MODEL == None):
            return 'Model not loaded'

        last_result = clustered_data[0]
        level = last_result

        for _ in range(0, randrange(100, 400)):
            
            # slice the last INPUT_WIDTH digits off the level generated thus far as a new input for the prediction
            lr_len = len(level)
            input_slice = level[lr_len - INPUT_WIDTH:lr_len]

            print(input_slice, np.shape(input_slice))

            reshaped = tf.reshape(input_slice, [INPUT_WIDTH, SLICE_LENGTH])

            print(reshaped, np.shape(reshaped))
            # generate new output
            # reshape input_slice to fit requirements and get new prediction
            prediction = MODEL.predict(reshaped)

            # map the prediction to IDs, then divide for proper prediction
            last_result = np.divide(np.round(prediction * MAX_ID), MAX_ID)

            # append last_result to level sequence
            level = np.append(level, last_result, axis=0)

        return jsonify((np.round(level * MAX_ID)).tolist())
    
    app.run()
    # print("Prediction:")
    # print(clustered_data[0])

    # # layer_name = 'lstm'
    # # intermediate_layer_model = keras.models.Model(inputs=model.input,
    # #                              outputs=model.get_layer(layer_name).output)
    # # intermediate_output = intermediate_layer_model.predict(clustered_data[0])

    # # print(intermediate_output)
    # inp = model.input
    # outputs = [layer.output for layer in model.layers]          # all layer outputs
    # functors = [K.function([inp], [out]) for out in outputs]

    # layer_outs = [func(clustered_data[0]) for func in functors]
    # print(layer_outs)
    # # prediction = model.predict(clustered_data[0])

    # # print("Next slice:")
    # # print(prediction * MAX_ID)