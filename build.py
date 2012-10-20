#!/usr/bin/env python3

import os, sys, re
from zipfile import ZipFile
from fnmatch import fnmatchcase
from xml.dom.minidom import parse as parse_xml
import xpath

extension_path = os.path.dirname(os.path.abspath(__file__)) if len(sys.argv) == 1 else sys.argv[1]
os.chdir(os.path.join(extension_path, "src"))

#infos holen
rdf_tree = parse_xml("install.rdf")
context = xpath.XPathContext(rdf_tree)

name    = context.findvalue("//em:id", rdf_tree)
version = context.findvalue("//em:version", rdf_tree)

xpi_path = os.path.join("..", "build", "{}-{}.xpi".format(name, version))
if os.path.isfile(xpi_path):
	print(xpi_path, "exists. deleting.")
	os.unlink(xpi_path)

def filename_include(filename):
	for pattern in (".*", "*~", "*.xcf"):
		if fnmatchcase(filename, pattern):
			return False
	return True

#schnüren der extension und entfernen von backups
with ZipFile(xpi_path, "w") as xpi_file:
	print("recreating", xpi_path)
	for dirpath, dirnames, filenames in os.walk("."):
		for filename in filenames:
			filepath = os.path.normpath(os.path.join(dirpath, filename))
			if filepath.endswith("~"):
				print("deleted backup", filepath)
				os.unlink(filepath)
			elif filename_include(filename):
				print("added", filepath)
				xpi_file.write(filepath)