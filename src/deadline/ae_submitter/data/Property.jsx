function ObservableProperty(initialValue) {

    var _value = initialValue;
    var _listeners = [];


    function get() {
        return _value;
    }

    function set(newValue) {
        var oldValue = _value
        var _callback;
        for (var i = 0; i < _listeners.length; i++) {
            _callback = _listeners[i]
            _callback(newValue, oldValue)
        }
        _value = newValue
    }

    /**
     Add a listener to this property.

     Listeners should be functions that take at most two arguments:

        newValue: The new value for this property.
        oldValue: The old value for this property.

     --> newvalue, oldvalue
    */
    function add_listener(callback) {
        if (_listeners.indexOf(callback) < 0) {
            _listeners.push(callback)
        }
    }

    function remove_listener(callback) {
        var idx = _listeners.indexOf(callback)
        if (idx >= 0) {
            _listeners.splice(idx, 1)
        }
    }

    return {
        "get": get,
        "set": set,
        "add_listener": add_listener,
        "remove_listener": remove_listener
    }
}