#!/usr/bin/python2.7
"""
Read a vim history file and transform it to a list
"""

import struct

FILE = "test/%Users%pomier%projects%vichy%client%history%cuicui.txt"
UF_ENTRY_MAGIC = 0xf518
UF_HEADER_MAGIC = 0x5fd0
UF_START_MAGIC = "Vim\237UnDo\345"
NMARKS = 26

class Header:
    """Represents a list of list in vim history"""

    def __init__(self):
        self.next_seq = 0
        self.prev_seq = 0
        self.alt_next_seq = 0
        self.alt_prev_seq = 0
        self.seq = 0
        self.cursor = None
        self.cursor_vcol = 0
        self.uh_flags = 0
        self.uh_visual = None
        self.entries = []

    def __str__(self):
        return str(self.entries)


class Pos:
    """Represents the position of the header"""

    def __init__(self):
        self.lnum = 0
        self.col = 0
        self.coladd = 0

    def __str__(self):
        s = "Line %d, Col %d, Coladd %d"%(self.lnum, self.col, self.coladd)
        return s


class Entry:
    """Contains the information for one undo or redo."""

    def __init__(self):
        self.top = 0
        self.bot = 0
        self.lcount = 0
        self.size = 0
        self.array = []

    def __str__(self):
        s = "Line %d to %d, %d lines, size %d"%(self.top, self.bot, self.lcount, self.size)
        return s

    def __repr__(self):
        s = "Line %d to %d, %d lines, size %d"%(self.top, self.bot, self.lcount, self.size)
        return s

class VisualInfo:
    def __init__(self):
        self.vi_start = None
        self.vi_end = None
        self.vi_mode = 0
        self.vi_curswant = 0


class HistoryFile:
    def __init__(self, name):
        f = open(name, 'rb')
        self.content = bytearray(f.read())
        self.length = len(self.content)
        self.pointer = 0

    def read(self, n):
        result = self.content[self.pointer:self.pointer+n]
        self.pointer += n
        return result

    def find_next_constant(self, v1, v2):
        while self.pointer + 1 < self.length:
            if self.content[self.pointer] == v1 and self.content[self.pointer+1] == v2:
                return True
            self.pointer += 1
        return False

    def is_finished(self, n):
        return self.pointer + n > self.length

    def is_constant(self, v1, v2):
        if self.pointer + 1 >= self.length:
            return False
        if self.content[self.pointer] == v1 and self.content[self.pointer+1] == v2:
            self.pointer += 2
            return True
        else:
            self.pointer += 2
            return False
        

    

def get_double(f):
    return struct.unpack_from('d', buffer(f.read(8)[::-1]))[0]

def get_int(f):
    return struct.unpack_from('i', buffer(f.read(4)[::-1]))[0]

def get_short(f):
    return struct.unpack_from('H', buffer(f.read(2)[::-1]))[0]

def get_char(f):
    return struct.unpack_from('b', buffer(f.read(1)[::-1]))[0]

def get_header(f):
    """Get the next header of the file"""
    uhp = Header()
    uhp.next_seq = get_int(f)
    uhp.prev_seq = get_int(f)
    uhp.alt_next_seq = get_int(f)
    uhp.alt_prev_seq = get_int(f)
    uhp.seq = get_int(f)
    if uhp.seq <= 0:
       print "Error"
       return

    uhp.cursor = get_pos(f)
    uhp.cursor_vcol = get_int(f)
    uhp.uh_flags = get_short(f)

    uhp.uh_visual = get_visual(f)

    f.find_next_constant(245, 24)
    while f.is_constant(245, 24):
        uep = get_entry(f)
        uhp.entries.append(uep)


    return uhp

def get_pos(f):
    """Get position in history"""
    pos = Pos()
    pos.lnum = get_int(f)
    pos.col = get_int(f)
    pos.coladd = get_int(f)
    return pos

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
    return uep

def get_visual(f):
    v = VisualInfo()
    v.vi_start = get_pos(f)
    v.vi_end = get_pos(f)
    v.vi_mode = get_int(f)
    v.vi_curswant = get_int(f)
    return v

def read_header(f):
    start = f.read(len(UF_START_MAGIC))
    if start != UF_START_MAGIC:
        print "Not a vim history file"
        return

    #Version
    get_short(f)
    #Hash
    f.read(32)

    nb_lines = get_int(f)
    print "Number of lines: %d"%(nb_lines)

    #Undo data for U
    str_len = get_int(f)
    if str_len > 0:
        s = f.read(str_len)
        ln = get_int(f)
        cn = get_int(f)
        print "Init text:\n%s"%(s)

    old_header_seq = get_int(f);
    new_header_seq = get_int(f);
    cur_header_seq = get_int(f);
    num_head = get_int(f);
    seq_last = get_int(f);
    seq_cur = get_int(f);

    headers = []
    while f.find_next_constant(95, 208):
        f.is_constant(95, 208)
        print "\n-------\nNew header\n-------\n"
        uhp = get_header(f)
        k = 0
        for i in uhp.entries:
            print "Entry %d"%(k)
            print i
            for j in i.array:
                print ">>>> %s"%(j)
            k += 1
            print ""
        headers.append(uhp)



if __name__ == '__main__':
    f = HistoryFile(FILE)
    read_header(f)
