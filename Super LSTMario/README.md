# LSTMario by Sam Vogelskamp
## Disclaimer
The FullScreenMario repository was taken down due to a DMCA complaint by Nintendo in 2016. The implementation used in the project was acquired using a way-back machine and is only treated as eligible for usage within the scope of this academic purpose. Given that the repository is public however, it might very well be taken down in the future due to a DMCA complaint.

## Requirements
The FullScreenMario implementation runs on pure HTML5 and JavaScript, meaning no extra requirements to deploy the frontend of the project.
The backend of the project was written in Python, using TensorFlow and NumPy to build the logic for the neural network. Additionally, the Flask library was used to provide a rudimentary API to request the data from.

## Running the project
To run the project, start the python backend by running the following command:
```shell
python .\Super LSTMario\Source\LSTM\model\lstmario.py
```
Then access the frontend by simply opening the [index](Super%20LSTMario/Source/index.html) file.
To generate an LSTM-generated level, a button labeled 'LSTMario' was introduced to the 'Maps' tab in the ingame menu. [reference](https://i.imgur.com/nKLcMe6.png)
After a loading period of roughly 30 seconds, the generated level should load in, with the level name being changed to 'LSTMario' appropriately.

