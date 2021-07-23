import numpy as np
import tensorflow as tf
import pandas as pd

import os
import json

from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras import backend as K

import flask

from flask import request, jsonify
from random import randrange

MIN_SLICES = 50
CLUSTER_LENGTH = 12
SLICE_LENGTH = 28
MAX_ID = 56
N_EPOCHS = 3

SAVE_PATH = '../saves/'
FILENAME = 'LSTMariov3.h5'
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

    for area in read_data:

        for i in range(0, len(area)-CLUSTER_LENGTH):

            # split into data and label
            data = np.array(area[i:i+CLUSTER_LENGTH - 1])
            labels = np.array(area[i+CLUSTER_LENGTH])

            # divide by MAX_ID for 0-1 range
            data = np.divide(data, MAX_ID)
            labels = np.divide(labels, MAX_ID)

            # add data and label to array
            clustered_data.append(tf.reshape(
                data, [CLUSTER_LENGTH - 1, SLICE_LENGTH]))
            clustered_labels.append(tf.reshape(
                labels, [SLICE_LENGTH]))

    print('Loaded', len(clustered_data), 'clusters')

    return np.asarray(clustered_data), np.asarray(clustered_labels)


# read clusters and labels
clustered_data, clustered_labels = read_data(
    '../random_data')

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

    MODEL.add(layers.Input((CLUSTER_LENGTH-1, SLICE_LENGTH)))
    # Since we are gonna feed in vertical slices of IDs, the input
    # and output size should match the amount of IDs per vertical slice
    # model.add(layers.TimeDistributed(layers.Dense(SLICE_LENGTH * 2),
    #   input_shape=(CLUSTER_LENGTH - 1, SLICE_LENGTH)))

    # model.add(layers.Dense(SLICE_LENGTH * 2))

    # # # Add a dropout layer to prevent overfitting

    # LSTM has a 1D output (just 1 slice)
    MODEL.add(layers.LSTM(128, activation='relu', return_sequences=True))
    MODEL.add(layers.Dropout(0.2))

    MODEL.add(layers.LSTM(128, activation='relu'))
    MODEL.add(layers.Dropout(0.2))

    MODEL.add(layers.Dense(SLICE_LENGTH * 2, activation='relu'))
    MODEL.add(layers.Dropout(0.2))

    # Dense layer with SLICE_LENGTH as output
    MODEL.add(layers.Dense(SLICE_LENGTH, activation='sigmoid'))

    MODEL.compile(loss='categorical_crossentropy',
                  optimizer=keras.optimizers.Adam(
                      learning_rate=1e-3, decay=1e-5),
                  metrics=['accuracy'])

    MODEL.summary()

    # train model
    MODEL.fit(x=clustered_data, y=clustered_labels, epochs=N_EPOCHS)

    # save model
    MODEL.save(SAVE_PATH + FILENAME)

    print('Saved model', FILENAME)

# if it does exist -> create the backend for requests
else:

    MODEL = keras.models.load_model(SAVE_PATH + FILENAME)
    print("Loaded existing model", FILENAME)

    app = flask.Flask(__name__)
    app.config["DEBUG"] = True

    @app.route('/', methods=['GET'])
    def fetch():

        # fail early if model not loaded
        if(MODEL == None):
            return 'Model not loaded'

        last_result = clustered_data[0]
        level = last_result

        print(clustered_data[0])
        test = MODEL.predict(last_result)

        print(test)
        # for i in range(0, randrange(1, 3)):
            
        #     # generate new output
        #     last_result = np.round(MODEL.predict(last_result) * MAX_ID)

        #     level.append(last_result)

        #     print(i, last_result, level)

        return jsonify(level)
    
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