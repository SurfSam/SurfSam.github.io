import numpy as np
import tensorflow as tf
import pandas as pd

import os
import json

from tensorflow import keras
from tensorflow.keras import layers

MIN_SLICES = 50
CLUSTER_LENGTH = 12
SLICE_LENGTH = 28
MAX_ID = 56

SAVE_PATH = './Super LSTMario/Source/LSTM/saves/'
FILENAME = 'LSTMariov2.h5'

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
                    data, [1, CLUSTER_LENGTH - 1, SLICE_LENGTH]))
                clustered_labels.append(tf.reshape(
                    labels, [1, SLICE_LENGTH]))

    print('Loaded', len(clustered_data), 'clusters')

    return clustered_data, clustered_labels

# read clusters and labels
clustered_data, clustered_labels = read_data('./Super LSTMario/Source/LSTM/slice_data')

# if no saved model exists -> train a new one
if not os.path.isfile(SAVE_PATH + FILENAME):

    model = keras.Sequential()

    # Since we are gonna feed in vertical slices of IDs, the input
    # and output size should match the amount of IDs per vertical slice
    model.add(layers.TimeDistributed(layers.Dense(SLICE_LENGTH * 2),
              input_shape=(CLUSTER_LENGTH - 1, SLICE_LENGTH)))

    # LSTM has a 1D output (just 1 slice)
    model.add(layers.LSTM(1))

    # Dense layer with SLICE_LENGTH as output
    model.add(layers.Dense(SLICE_LENGTH, activation='sigmoid'))

    opt = keras.optimizers.Adam(learning_rate=1e-3, decay=1e-5)

    model.compile(loss='categorical_crossentropy',
                  optimizer=opt,
                  metrics=['accuracy'])

    model.summary()

    # create dataset from clusters and labels
    train_data = tf.data.Dataset.from_tensor_slices(
        (clustered_data, clustered_labels))

    # shuffle data
    train_data = train_data.shuffle(10)

    # train model
    model.fit(x=train_data, epochs=3)

    # save model
    model.save(SAVE_PATH + FILENAME)

    print('Saved model', FILENAME)

# if it does exist -> load the savefile
else:

    model = keras.models.load_model(SAVE_PATH + FILENAME)
    print("Loaded existing model", FILENAME)

    print("Prediction:")
    print(clustered_data[0])
    prediction = model.predict(clustered_data[0])

    print("Next slice:")
    print(prediction * MAX_ID)
