#!/usr/bin/python2.7
"""
Read a vim history file and transform it to a list
"""

import struct

FILE = "test/vim_hist.txt"

class Entry:
    """Contains the information for one undo or redo."""

    def __init__(self):
        self.top = 0
        self.bot = 0
        self.lcount = 0
        self.size = 0
        self.array = []

def get_int(f):
    return struct.unpack('i', f.read(4))

def get_entry(f):
    """Get the next entry of the file"""
    uep = Entry()
    uep.top = get_int(f)
    uep.bot = get_int(f)
    uep.lcount = get_int(f)
    uep.size = get_int(f)
    for i in range(uep.size):
        line_length = get_int(f)
        uep.array.append(f.read(line_length))


if __name__ == '__main__':
    pass
